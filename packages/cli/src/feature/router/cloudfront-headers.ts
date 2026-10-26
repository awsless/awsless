import { createHash, createHmac } from 'crypto'
import { seconds, toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { findInputDeps, getMeta, Group, Input, Meta, Output, Resource } from '@terraforge/core'
import { StackConfig } from '../../config/stack.js'
import { AppContext } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'

// CloudFront adds it to every request it sends the load balancer, whose
// rules only forward requests that carry it, so nobody calls it directly.
export const ORIGIN_SECRET_HEADER = 'x-origin-secret'

export const LOAD_BALANCER_ORIGIN = 'load-balancer'

// A distribution origin waits up to 60 seconds without a quota raise.
const ORIGIN_READ_TIMEOUT = toSeconds(seconds(60))

// A listener's rule priorities run from 1 to 50000.
const MAX_PRIORITY = 50_000

export type HeaderRoute = {
	path: string
	headers: string[]
}

// The routes of every stack that ask for CloudFront headers, per router.
export const collectHeaderRoutes = (stackConfigs: StackConfig[]) => {
	const routers: Record<string, HeaderRoute[]> = {}

	for (const stackConfig of stackConfigs) {
		for (const [id, patterns] of Object.entries(stackConfig.routes ?? {})) {
			for (const [path, props] of Object.entries(patterns)) {
				if (props.loadBalancer) {
					routers[id] ??= []
					routers[id].push({ path, headers: props.loadBalancer.cloudfrontHeaders })
				}
			}
		}
	}

	return routers
}

// Routes that name the same headers, in any order or case, share a policy.
export const formatHeaderListKey = (headers: string[]) => {
	return headers
		.map(header => header.toLowerCase())
		.toSorted()
		.join(',')
}

export const getOriginSecret = (appId: string) => {
	return createHmac('sha1', appId).update('router:cloudfront-headers').digest('hex')
}

// The distribution is made before the load balancer can be, since a
// pubsub one only exists later, so its domain is filled in at ready time.
export const createLateInput = <T>() => {
	const dependencies = new Set<Meta>()
	let source: Input<T> | undefined

	const output = new Output<T>(dependencies, (resolve, reject) => {
		if (source === undefined) {
			reject(new Error('The late input was never set.'))
		} else {
			Promise.resolve(source).then(value => resolve(value as T), reject)
		}
	})

	return {
		output,
		// The extra resources go first, like a load balancer rule the origin needs.
		set(value: Input<T>, extra: Resource[] = []) {
			source = value

			for (const dependency of findInputDeps(value)) {
				dependencies.add(dependency)
			}

			for (const resource of extra) {
				dependencies.add(getMeta(resource))
			}
		},
	}
}

export const createCloudFrontHeadersPolicies = (group: Group, ctx: AppContext, id: string, routes: HeaderRoute[]) => {
	const policies = new Map<string, aws.cloudfront.OriginRequestPolicy>()

	for (const route of routes) {
		const key = formatHeaderListKey(route.headers)

		if (policies.has(key)) {
			continue
		}

		policies.set(
			key,
			new aws.cloudfront.OriginRequestPolicy(group, `cloudfront-headers-${shortId(key)}`, {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'router',
					resourceName: id,
					postfix: `cloudfront-headers-${shortId(key)}`,
				}),
				headersConfig: {
					// Naming CloudFront headers forwards every viewer header, host
					// included, which only the load balancer origin accepts.
					headerBehavior: 'allViewerAndWhitelistCloudFront',
					headers: { items: route.headers },
				},
				cookiesConfig: { cookieBehavior: 'all' },
				queryStringsConfig: { queryStringBehavior: 'all' },
			})
		)
	}

	return policies
}

export const createLoadBalancerOrigin = (domainName: Input<string>, secret: string) => ({
	id: LOAD_BALANCER_ORIGIN,
	domainName,
	customHeader: [{ headerName: ORIGIN_SECRET_HEADER, headerValue: secret }],
	customOriginConfig: [
		{
			httpPort: 80,
			httpsPort: 443,
			originProtocolPolicy: 'http-only',
			originReadTimeout: ORIGIN_READ_TIMEOUT,
			originSslProtocols: ['TLSv1.2'],
		},
	],
})

// A priority from the router & path, so adding or removing a path leaves
// the other rules alone; a clash moves on to the next free one.
export const assignRulePriorities = (keys: string[]) => {
	const used = new Set<number>()
	const priorities = new Map<string, number>()

	for (const key of keys.toSorted()) {
		let priority = (parseInt(createHash('sha1').update(key).digest('hex').slice(0, 8), 16) % MAX_PRIORITY) + 1

		while (used.has(priority)) {
			priority = (priority % MAX_PRIORITY) + 1
		}

		used.add(priority)
		priorities.set(key, priority)
	}

	return priorities
}

// The rule takes the path with & without the trailing slash, like the route store does.
export const formatRulePaths = (path: string) => {
	return path === '/' || path.endsWith('/') ? [path] : [path, `${path}/`]
}

type LoadBalancer = {
	dnsName: Output<string>
	listenerArn: Output<string>
}

// The pubsub load balancer already lets CloudFront in, so the paths share
// it; an app without one gets a load balancer set up the same way.
const getLoadBalancer = (group: Group, ctx: AppContext): LoadBalancer => {
	const pubsubId = Object.keys(ctx.appConfig.pubsub ?? {}).toSorted()[0]

	if (pubsubId && ctx.shared.has('pubsub', 'load-balancer', pubsubId)) {
		return ctx.shared.entry('pubsub', 'load-balancer', pubsubId)
	}

	const name = formatGlobalResourceName({
		appName: ctx.app.name,
		resourceType: 'router',
		resourceName: 'lb',
	})

	const vpcId = ctx.shared.get('vpc', 'id')

	const cloudfrontPrefixList = aws.ec2.getManagedPrefixList(group, 'cloudfront-prefix-list', {
		name: 'com.amazonaws.global.cloudfront.origin-facing',
	})

	const securityGroup = new aws.security.Group(group, 'lb-security', {
		name,
		vpcId,
		description: name,
	})

	new aws.vpc.SecurityGroupIngressRule(group, 'lb-ingress', {
		securityGroupId: securityGroup.id,
		description: 'Allow http traffic from CloudFront',
		ipProtocol: 'tcp',
		prefixListId: cloudfrontPrefixList.id,
		fromPort: 80,
		toPort: 80,
	})

	new aws.vpc.SecurityGroupEgressRule(group, 'lb-egress', {
		securityGroupId: securityGroup.id,
		description: 'Allow all outbound traffic',
		ipProtocol: '-1',
		cidrIpv4: '0.0.0.0/0',
	})

	const lb = new aws.Lb(group, 'lb', {
		name: shortId(`${name}:lb:${ctx.appId}`),
		internal: false,
		loadBalancerType: 'application',
		subnets: ctx.shared.get('vpc', 'public-subnets'),
		securityGroups: [securityGroup.id],
		idleTimeout: ORIGIN_READ_TIMEOUT,
	})

	const listener = new aws.lb.Listener(group, 'listener', {
		loadBalancerArn: lb.arn,
		port: 80,
		protocol: 'HTTP',
		defaultAction: [
			{
				type: 'fixed-response',
				fixedResponse: {
					contentType: 'text/plain',
					messageBody: 'Forbidden',
					statusCode: '403',
				},
			},
		],
	})

	return {
		dnsName: lb.dnsName,
		listenerArn: listener.arn,
	}
}

// One target group on the live bundle alias serves every path, since the
// bundle picks the handler by the route header the router function sets.
export const createLoadBalancerTarget = (props: {
	ctx: AppContext
	routers: Record<string, HeaderRoute[]>
	routerGroups: Record<string, Group>
	secret: string
}) => {
	const { ctx } = props
	const bundle = ctx.shared.get('bundle', 'main')
	const group = new Group(ctx.base, 'router', 'load-balancer')
	const lb = getLoadBalancer(group, ctx)

	const targetGroup = new aws.lb.TargetGroup(group, 'target', {
		name: shortId(`${ctx.app.name}:router:target:${ctx.appId}`),
		targetType: 'lambda',
		// Repeated headers & query params reach the handler like they do through the function url.
		lambdaMultiValueHeadersEnabled: true,
		// No health check block: a lambda target group has none by default,
		// & the provider refuses one with its default protocol.
	})

	const permission = new aws.lambda.Permission(group, 'permission', {
		action: 'lambda:InvokeFunction',
		principal: 'elasticloadbalancing.amazonaws.com',
		functionName: bundle.lambda.functionName,
		qualifier: bundle.alias.name,
		sourceArn: targetGroup.arn,
	})

	const attachment = new aws.lb.TargetGroupAttachment(
		group,
		'attachment',
		{
			targetGroupArn: targetGroup.arn,
			targetId: bundle.alias.arn,
		},
		{
			dependsOn: [permission],
		}
	)

	const priorities = assignRulePriorities(
		Object.entries(props.routers).flatMap(([id, routes]) => routes.map(route => `${id}:${route.path}`))
	)

	const rules: Record<string, Resource[]> = {}

	for (const [id, routes] of Object.entries(props.routers)) {
		rules[id] = routes.map(
			route =>
				new aws.lb.ListenerRule(
					props.routerGroups[id]!,
					`cloudfront-headers-${shortId(route.path)}`,
					{
						listenerArn: lb.listenerArn,
						priority: priorities.get(`${id}:${route.path}`)!,
						action: [{ type: 'forward', targetGroupArn: targetGroup.arn }],
						condition: [
							{ pathPattern: { values: formatRulePaths(route.path) } },
							{ httpHeader: { httpHeaderName: ORIGIN_SECRET_HEADER, values: [props.secret] } },
						],
					},
					{
						dependsOn: [attachment],
					}
				)
		)
	}

	return { dnsName: lb.dnsName, attachment, rules }
}
