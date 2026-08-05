import { seconds } from '@awsless/duration'
import { mebibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { createHmac } from 'crypto'
import { dirname, join } from 'path'
import { fileURLToPath } from 'node:url'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createPrebuildLambdaFunction } from '../function/prebuild.js'
import { createAsyncLambdaFunction, createLambdaFunction } from '../function/util.js'
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
	onBefore(ctx) {
		const found = Object.keys(ctx.appConfig.defaults.pubsub ?? {}).length > 0

		if (!found) {
			return
		}

		const group = new Group(ctx.base, 'pubsub', 'asset')

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDestroy: true,
		})

		ctx.shared.set('pubsub', 'bucket-name', bucket.bucket)
	},
	onApp(ctx) {
		const pubsubs = Object.entries(ctx.appConfig.defaults.pubsub ?? {})

		if (pubsubs.length === 0) {
			return
		}

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
			// Create the auth lambda

			const auth = createLambdaFunction(group, ctx, 'pubsub-auth', id, props.auth)

			// ------------------------------------------------------------
			// Create the SNS events topic.
			// Listeners subscribe with a filter policy on the event type.

			const topicName = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub-events',
				resourceName: id,
			})

			const topic = new aws.sns.Topic(group, 'events', {
				name: topicName,
			})

			ctx.shared.add('pubsub', 'events-topic-arn', id, topic.arn)

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
					majorEngineVersion: '8',
					securityGroupIds: [cacheSecurityGroup.id],
					subnetIds: ctx.shared.get('vpc', 'private-subnets'),
				},
				{
					import: ctx.import ? cacheName : undefined,
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
			// Create the fargate service

			const secret = createHmac('sha1', ctx.appId).update(name).digest('hex')

			const service = createPubSubService(group, ctx, id, props, {
				clusterName: cluster.name,
				clusterArn: cluster.arn,
				targetGroupArn: targetGroup.arn,
				securityGroupId: taskSecurityGroup.id,
				environment: {
					AUTH: auth.name,
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
					resources: [auth.lambda.arn],
				},
				{
					actions: ['sns:Publish'],
					resources: [topic.arn],
				}
			)

			// ------------------------------------------------------------
			// Create the publisher lambda that runs inside the VPC,
			// so that user lambdas can publish without VPC access.

			const publisher = createPrebuildLambdaFunction(group, ctx, 'pubsub-publisher', id, {
				bundleFile: join(__dirname, '/prebuild/pubsub-publisher/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/pubsub-publisher/HASH'),
				memorySize: mebibytes(256),
				timeout: seconds(10),
				handler: 'index.default',
				runtime: 'nodejs24.x',
				vpc: true,
				log: props.log,
			})

			publisher.setEnvironment('REDIS_HOST', redisHost)
			publisher.setEnvironment(
				'REDIS_PORT',
				redisPort.pipe(port => port.toString())
			)
			publisher.setEnvironment('CHANNEL', channel)

			ctx.addGlobalPermission({
				actions: ['lambda:InvokeFunction'],
				resources: [publisher.lambda.arn],
			})

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

			addRoutes(group, `pubsub-${id}`, {
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
			ctx.bind(`PUBSUB_${constantCase(id)}_PUBLISHER`, publisher.name)
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.pubsub ?? {})) {
			const group = new Group(ctx.stack, 'pubsub', id)
			const topicArn = ctx.shared.entry('pubsub', 'events-topic-arn', id)

			for (const event of pubsubEventTypes) {
				const consumer = props[event]

				if (!consumer) {
					continue
				}

				const eventGroup = new Group(group, 'event', event)

				const { lambda } = createAsyncLambdaFunction(eventGroup, ctx, `pubsub`, `${id}-${event}`, {
					consumer,
					retryAttempts: 2,
				})

				new aws.sns.TopicSubscription(eventGroup, 'subscription', {
					topicArn,
					protocol: 'lambda',
					endpoint: lambda.arn,
					filterPolicyScope: 'MessageAttributes',
					filterPolicy: JSON.stringify({
						event: [event],
					}),
				})

				new aws.lambda.Permission(eventGroup, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 'sns.amazonaws.com',
					functionName: lambda.functionName,
					sourceArn: topicArn,
				})
			}
		}
	},
})
