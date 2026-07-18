import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { createHmac } from 'crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'path'
import { formatRouteEnvName } from 'awsless'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { LIVE_LAMBDA_ALIAS } from '../../util/lambda.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import { formatFullDomainName } from '../domain/util.js'
import { pubsubEventTypes } from './schema.js'
import { createPubSubService, WS_PORT } from './util.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const typeGenCode = `
import type { Mock } from 'vitest'

type Publish = (topic: string, event: string, payload?: unknown) => Promise<void>
type PubSubInstance = {
	readonly publish: Publish
}

type MockHandle = (payload: { topic: string; event: string; payload?: unknown }) => void
type MockBuilder = (handle?: MockHandle) => void
type MockObject = Mock<(payload: unknown) => unknown>
`

export const pubsubFeature = defineFeature({
	name: 'pubsub',
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const id of Object.keys(ctx.appConfig.defaults.pubsub ?? {})) {
			resources.addType(id, `PubSubInstance`)
			mocks.addType(id, `MockBuilder`)
			mockResponses.addType(id, `MockObject`)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('PubSubResources', resources)
		gen.addInterface('PubSubMock', mocks)
		gen.addInterface('PubSubMockResponse', mockResponses)

		await ctx.write('pubsub.d.ts', gen, true)
	},
	onValidate(ctx) {
		const pubsubs = ctx.appConfig.defaults.pubsub ?? {}

		for (const [id, props] of Object.entries(pubsubs)) {
			if (!(props.router in (ctx.appConfig.defaults.router ?? {}))) {
				throw new FileError('app.json', `The pubsub "${id}" points to a non existent router "${props.router}"`)
			}
		}

		for (const stack of ctx.stackConfigs) {
			for (const id of Object.keys(stack.pubsub ?? {})) {
				if (!(id in pubsubs)) {
					throw new FileError(stack.file, `Listening to a non existent pubsub "${id}"`)
				}
			}
		}
	},
	onApp(ctx) {
		const pubsubs = Object.entries(ctx.appConfig.defaults.pubsub ?? {})

		if (pubsubs.length === 0) {
			return
		}

		const bundle = ctx.shared.get('bundle', 'main')

		// ------------------------------------------------------------
		// Create the shared ECS cluster

		const clusterGroup = new Group(ctx.base, 'pubsub', 'cluster')

		const cluster = new aws.ecs.Cluster(
			clusterGroup,
			'cluster',
			{
				name: `${ctx.app.name}-pubsub`,
			},
			{
				replaceOnChanges: ['name'],
			}
		)

		for (const [id, props] of pubsubs) {
			const group = new Group(ctx.base, 'pubsub', id)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub',
				resourceName: id,
			})

			const vpcId = ctx.shared.get('vpc', 'id')

			// ------------------------------------------------------------
			// The auth handler lives inside the shared bundle

			const authRouteKey = formatRouteKey(ctx.app.name, 'pubsub', `${id}-auth`)

			registerBundleFunction(ctx, authRouteKey, props.auth)

			// ------------------------------------------------------------
			// Create the SNS events topic.
			// The bundle subscribes with a filter policy on the event types
			// that have a listener.

			const topicName = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub-events',
				resourceName: id,
			})

			const topic = new aws.sns.Topic(group, 'events', {
				name: topicName,
			})

			ctx.shared.add('pubsub', 'events-topic-arn', id, topic.arn)

			const events = pubsubEventTypes.filter(event => {
				return ctx.stackConfigs.some(stack => stack.pubsub?.[id]?.[event])
			})

			if (events.length > 0) {
				new aws.sns.TopicSubscription(group, 'subscription', {
					topicArn: topic.arn,
					protocol: 'lambda',
					endpoint: bundle.alias.arn,
					filterPolicyScope: 'MessageAttributes',
					filterPolicy: JSON.stringify({
						event: events,
					}),
				})

				new aws.lambda.Permission(group, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 'sns.amazonaws.com',
					functionName: bundle.lambda.functionName,
					qualifier: bundle.alias.name,
					sourceArn: topic.arn,
				})
			}

			// ------------------------------------------------------------
			// Create the Redis pub/sub cache used to fan-out messages
			// to every fargate task.

			// ElastiCache doesn't allow consecutive hyphens in the name.
			const cacheName = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub-cache',
				resourceName: id,
				seperator: '-',
			})

			const cacheSecurityGroup = new aws.security.Group(group, 'cache-security', {
				name: cacheName,
				vpcId,
				description: cacheName,
			})

			const cache = new aws.elasticache.ServerlessCache(
				group,
				'cache',
				{
					name: cacheName,
					engine: 'valkey',
					networkType: 'dual_stack',
					majorEngineVersion: '8',
					securityGroupIds: [cacheSecurityGroup.id],
					subnetIds: ctx.shared.get('vpc', 'private-subnets'),
				},
				{
					import: ctx.import ? cacheName : undefined,
					// The network type can only be set at creation time.
					replaceOnChanges: ['networkType'],
				}
			)

			const redisHost = cache.endpoint.pipe(v => v.at(0)!.address)
			const redisPort = cache.endpoint.pipe(v => v.at(0)!.port)

			new aws.vpc.SecurityGroupIngressRule(group, 'cache-rule-ip-v4', {
				securityGroupId: cacheSecurityGroup.id,
				description: redisPort.pipe(port => `Allow ipv4 on port: ${port}`),
				ipProtocol: 'tcp',
				cidrIpv4: '0.0.0.0/0',
				fromPort: redisPort,
				toPort: redisPort,
			})

			new aws.vpc.SecurityGroupIngressRule(group, 'cache-rule-ip-v6', {
				securityGroupId: cacheSecurityGroup.id,
				description: redisPort.pipe(port => `Allow ipv6 on port: ${port}`),
				ipProtocol: 'tcp',
				cidrIpv6: '::/0',
				fromPort: redisPort,
				toPort: redisPort,
			})

			const channel = `pubsub:${id}`

			// ------------------------------------------------------------
			// Only allow CloudFront to reach the load balancer.

			const cloudfrontPrefixList = aws.ec2.getManagedPrefixList(group, 'cloudfront-prefix-list', {
				name: 'com.amazonaws.global.cloudfront.origin-facing',
			})

			const lbSecurityGroup = new aws.security.Group(group, 'lb-security', {
				name: `${name}-lb`,
				vpcId,
				description: `${name}-lb`,
			})

			new aws.vpc.SecurityGroupIngressRule(group, 'lb-ingress', {
				securityGroupId: lbSecurityGroup.id,
				description: 'Allow http traffic from CloudFront',
				ipProtocol: 'tcp',
				prefixListId: cloudfrontPrefixList.id,
				fromPort: 80,
				toPort: 80,
			})

			new aws.vpc.SecurityGroupEgressRule(group, 'lb-egress', {
				securityGroupId: lbSecurityGroup.id,
				description: 'Allow all outbound traffic',
				ipProtocol: '-1',
				cidrIpv4: '0.0.0.0/0',
			})

			const taskSecurityGroup = new aws.security.Group(group, 'task-security', {
				name: `${name}-task`,
				vpcId,
				description: `${name}-task`,
			})

			new aws.vpc.SecurityGroupIngressRule(group, 'task-ingress', {
				securityGroupId: taskSecurityGroup.id,
				description: 'Allow websocket traffic from the load balancer',
				ipProtocol: 'tcp',
				referencedSecurityGroupId: lbSecurityGroup.id,
				fromPort: WS_PORT,
				toPort: WS_PORT,
			})

			new aws.vpc.SecurityGroupEgressRule(group, 'task-egress', {
				securityGroupId: taskSecurityGroup.id,
				description: 'Allow all outbound traffic',
				ipProtocol: '-1',
				cidrIpv4: '0.0.0.0/0',
			})

			// ------------------------------------------------------------
			// Create the load balancer

			const lb = new aws.Lb(group, 'lb', {
				name: shortId(`${name}:lb:${ctx.appId}`),
				internal: false,
				loadBalancerType: 'application',
				subnets: ctx.shared.get('vpc', 'public-subnets'),
				securityGroups: [lbSecurityGroup.id],
				idleTimeout: 120,
			})

			const targetGroup = new aws.lb.TargetGroup(group, 'target', {
				name: shortId(`${name}:target:${ctx.appId}`),
				targetType: 'ip',
				port: WS_PORT,
				protocol: 'HTTP',
				vpcId,
				deregistrationDelay: '30',
				healthCheck: {
					enabled: true,
					path: '/health',
					interval: 10,
					timeout: 5,
					healthyThreshold: 2,
					unhealthyThreshold: 2,
					matcher: '200',
				},
			})

			new aws.lb.Listener(group, 'listener', {
				loadBalancerArn: lb.arn,
				port: 80,
				protocol: 'HTTP',
				defaultAction: [
					{
						type: 'forward',
						targetGroupArn: targetGroup.arn,
					},
				],
			})

			// ------------------------------------------------------------
			// Create the fargate service.
			// The server authenticates through the live bundle alias, so the
			// task env stays stable across deployments & sockets only ever
			// reconnect on pubsub changes.

			const secret = createHmac('sha1', ctx.appId).update(name).digest('hex')

			const service = createPubSubService(group, ctx, id, props, {
				clusterName: cluster.name,
				clusterArn: cluster.arn,
				targetGroupArn: targetGroup.arn,
				securityGroupId: taskSecurityGroup.id,
				environment: {
					AUTH: bundle.lambda.functionName.pipe(name => `${name}:${LIVE_LAMBDA_ALIAS}`),
					AUTH_ROUTE: authRouteKey,
					EVENTS_TOPIC: topicName,
					PORT: WS_PORT.toString(),
					REDIS_HOST: redisHost,
					REDIS_PORT: redisPort.pipe(port => port.toString()),
					CHANNEL: channel,
					ORIGIN_SECRET: secret,
				},
			})

			service.addPermission(
				{
					actions: ['lambda:InvokeFunction'],
					resources: [bundle.lambda.arn.pipe(arn => `${arn}:${LIVE_LAMBDA_ALIAS}`)],
				},
				{
					actions: ['sns:Publish'],
					resources: [topic.arn],
				}
			)

			// ------------------------------------------------------------
			// The publisher handler lives inside the shared bundle, which
			// reaches redis through the app vpc.

			const publisherRouteKey = formatRouteKey(ctx.app.name, 'pubsub', `${id}-publisher`)

			bundle.addHandler({
				routeKey: publisherRouteKey,
				file: join(__dirname, '/handlers/pubsub-publisher.mjs'),
				exportName: 'default',
			})

			bundle.addEnv(formatRouteEnvName(publisherRouteKey, 'REDIS_HOST'), redisHost)
			bundle.addEnv(
				formatRouteEnvName(publisherRouteKey, 'REDIS_PORT'),
				redisPort.pipe(port => port.toString())
			)
			bundle.addEnv(formatRouteEnvName(publisherRouteKey, 'CHANNEL'), channel)

			// ------------------------------------------------------------
			// Route the pubsub path through the router

			const routerProps = ctx.appConfig.defaults.router?.[props.router]

			if (!routerProps?.domain) {
				throw new FileError(
					'app.json',
					`The pubsub "${id}" requires the "${props.router}" router to have a domain configured.`
				)
			}

			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)

			addRoutes({
				[`${props.path}/*`]: {
					type: 'url',
					domainName: lb.dnsName,
					readTimeout: 60,
					customHeaders: {
						'x-origin-secret': secret,
					},
					rewrite: {
						regex: `^${props.path}/(.*)$`,
						to: '/$1',
					},
				},
			})

			// ------------------------------------------------------------
			// Bind the pubsub env vars

			const domainName = formatFullDomainName(ctx.appConfig, routerProps.domain, routerProps.subDomain)

			ctx.bind(`PUBSUB_${constantCase(id)}_ENDPOINT`, `wss://${domainName}${props.path}/ws`)
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.pubsub ?? {})) {
			for (const event of pubsubEventTypes) {
				const consumer = props[event]

				if (!consumer) {
					continue
				}

				registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'pubsub', `${id}-${event}`), consumer)
			}
		}
	},
})
