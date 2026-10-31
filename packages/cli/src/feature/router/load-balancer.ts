import { createHmac } from 'crypto'
import { seconds, toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group, Input } from '@terraforge/core'
import { AppConfig } from '../../config/app.js'
import { StackConfig } from '../../config/stack.js'
import { AppContext } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteRuleKey, ORIGIN_SECRET_HEADER } from '../load-balancer/util.js'

export const LOAD_BALANCER_ORIGIN = 'load-balancer'

// A distribution origin waits up to 60 seconds without a quota raise.
const ORIGIN_READ_TIMEOUT = toSeconds(seconds(60))

export type HeaderRoute = {
	path: string
	headers: string[]
}

// The routes of every stack that ask for CloudFront headers, per router.
export const collectHeaderRoutes = (ctx: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => {
	const routers: Record<string, HeaderRoute[]> = {}

	for (const stackConfig of ctx.stackConfigs) {
		for (const [id, patterns] of Object.entries(stackConfig.routes ?? {})) {
			if (!ctx.appConfig.router?.[id]) {
				continue
			}

			for (const [path, props] of Object.entries(patterns)) {
				if (props.loadBalancer) {
					routers[id] ??= []
					routers[id].push({ path, headers: props.loadBalancer.cloudfrontHeaders ?? [] })
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
				headersConfig:
					route.headers.length > 0
						? {
								// Naming CloudFront headers forwards every viewer header, host
								// included, which only the load balancer origin accepts.
								headerBehavior: 'allViewerAndWhitelistCloudFront',
								headers: { items: route.headers },
							}
						: // A route without CloudFront headers (one that only takes a body
							// it can't sign) still forwards the viewer's.
							{ headerBehavior: 'allViewer' },
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

// The rule takes the path with & without the trailing slash, like the route store does.
export const formatRulePaths = (path: string) => {
	return path === '/' || path.endsWith('/') ? [path] : [path, `${path}/`]
}

// One target group on the live bundle alias serves every path, since the
// bundle picks the handler by the route header the router function sets.
// Its rules go on the app's load balancer listener.
export const createLoadBalancerTarget = (props: {
	ctx: AppContext
	routers: Record<string, HeaderRoute[]>
	routerGroups: Record<string, Group>
	secret: string
}) => {
	const { ctx } = props
	const bundle = ctx.shared.get('bundle', 'main')
	const loadBalancer = ctx.shared.get('load-balancer', 'main')
	const group = new Group(ctx.base, 'router', 'load-balancer')

	const targetGroup = new aws.lb.TargetGroup(group, 'lb-target', {
		name: shortId(`${ctx.app.name}:router:lb-target:${ctx.appId}`),
		targetType: 'lambda',
		// Repeated headers & query params reach the handler like they do through the function url.
		lambdaMultiValueHeadersEnabled: true,
		// No health check block: a lambda target group has none by default,
		// & the provider refuses one with its default protocol.
	})

	const permission = new aws.lambda.Permission(group, 'lb-permission', {
		action: 'lambda:InvokeFunction',
		principal: 'elasticloadbalancing.amazonaws.com',
		functionName: bundle.lambda.functionName,
		qualifier: bundle.alias.name,
		sourceArn: targetGroup.arn,
	})

	const attachment = new aws.lb.TargetGroupAttachment(
		group,
		'lb-attachment',
		{
			targetGroupArn: targetGroup.arn,
			targetId: bundle.alias.arn,
		},
		{
			dependsOn: [permission],
		}
	)

	for (const [id, routes] of Object.entries(props.routers)) {
		for (const route of routes) {
			new aws.lb.ListenerRule(
				props.routerGroups[id]!,
				`load-balancer-${shortId(route.path)}`,
				{
					listenerArn: loadBalancer.listener.arn,
					priority: loadBalancer.priority(formatRouteRuleKey(id, route.path)),
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
		}
	}
}
