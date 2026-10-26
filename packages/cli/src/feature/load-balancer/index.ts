import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { defineFeature } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { collectHeaderRoutes } from '../router/load-balancer.js'
import { assignRulePriorities, formatPubSubRuleKey, formatRouteRuleKey } from './util.js'

// Websockets stay open through the load balancer while idle for up to 2
// minutes; an http request is cut off sooner by CloudFront's read timeout.
const IDLE_TIMEOUT = 120

// One Application Load Balancer per app, behind CloudFront only, for the
// pubsub servers & the router paths that need CloudFront's own headers.
export const loadBalancerFeature = defineFeature({
	name: 'load-balancer',
	onApp(ctx) {
		const pubsubIds = Object.keys(ctx.appConfig.pubsub ?? {})
		const headerRoutes = collectHeaderRoutes(ctx)

		const ruleKeys = [
			...pubsubIds.map(formatPubSubRuleKey),
			...Object.entries(headerRoutes).flatMap(([id, routes]) =>
				routes.map(route => formatRouteRuleKey(id, route.path))
			),
		]

		if (ruleKeys.length === 0) {
			return
		}

		const group = new Group(ctx.base, 'load-balancer', 'main')
		const name = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'load-balancer',
			resourceName: 'main',
		})
		const vpcId = ctx.shared.get('vpc', 'id')

		const cloudfrontPrefixList = aws.ec2.getManagedPrefixList(group, 'cloudfront-prefix-list', {
			name: 'com.amazonaws.global.cloudfront.origin-facing',
		})

		const securityGroup = new aws.security.Group(group, 'lb-security', {
			name: `${name}`,
			vpcId,
			description: `${name}`,
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
			idleTimeout: IDLE_TIMEOUT,
		})

		// Every use adds a rule that checks its own origin secret, so a request
		// without one gets nothing.
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

		const priorities = assignRulePriorities(ruleKeys)

		ctx.shared.set('load-balancer', 'main', {
			lb,
			listener,
			securityGroup,
			dnsName: lb.dnsName,
			priority(key) {
				const priority = priorities.get(key)

				if (priority === undefined) {
					throw new TypeError(`No load balancer rule priority for: ${key}`)
				}

				return priority
			},
		})
	},
})
