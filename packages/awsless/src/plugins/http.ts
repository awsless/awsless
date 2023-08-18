
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { SecurityGroup } from '../formation/resource/ec2/security-group.js';
import { Peer } from '../formation/resource/ec2/peer.js';
import { Port } from '../formation/resource/ec2/port.js';
import { RecordSet } from '../formation/resource/route53/record-set.js';
import { LoadBalancer } from '../formation/resource/elb/load-balancer.js';
import { Listener, ListenerAction } from '../formation/resource/elb/listener.js';
import { HttpRequestMethod, ListenerCondition } from '../formation/resource/elb/listener-rule.js';
import { ElbEventSource } from '../formation/resource/lambda/event-source/elb.js';

type Route = `${HttpRequestMethod} /${string}`

const RouteSchema = z.custom<Route>((route) => {
	return z.string()
		.regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/]*)$/ig)
		.safeParse(route).success
}, 'Invalid route')

const parseRoute = (route:Route) => {
	const [ method, ...paths ] = route.split(' ') as [ HttpRequestMethod, string ]
	const path = paths.join(' ')

	return { method, path }
}

const strToInt = (str: string) => {
	return parseInt(Buffer.from(str, 'utf8').toString('hex'), 16)
}

const generatePriority = (stackName: string, route: string) => {
	const start = strToInt(stackName) % 500 + 1
	const end = strToInt(route) % 100
	const priority = start + '' + end

	return parseInt(priority, 10)
}

export const httpPlugin = definePlugin({
	name: 'http',
	schema: z.object({
		defaults: z.object({
			/** Define your global http api's.
			 * @example
			 * {
			 *   http: {
			 *     HTTP_API_NAME: {
			 *       domain: 'example.com',
			 *       subDomain: 'api',
			 *     }
			 *   }
			 * }
			 */
			http: z.record(
				ResourceIdSchema,
				z.object({
					/** The domain to link your api with. */
					domain: z.string(),
					subDomain: z.string().optional(),
				}),
			).optional()
		}).default({}),
		stacks: z.object({
			/** Define routes in your stack for your global http api.
			 * @example
			 * {
			 *   http: {
			 *     HTTP_API_NAME: {
			 *       'GET /': 'index.ts',
			 *       'POST /posts': 'create-post.ts',
			 *     }
			 *   }
			 * }
			 */
			http: z.record(
				ResourceIdSchema,
				z.record(RouteSchema, FunctionSchema),
			).optional()
		}).array()
	}),
	onApp({ config, bootstrap, usEastBootstrap }) {

		if(Object.keys(config.defaults?.http || {}).length === 0) {
			return
		}

		const vpcId = bootstrap.get('vpc-id')
		const securityGroup = new SecurityGroup('http', {
			description: 'http security group',
			vpcId,
		})

		securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443))
		securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443))

		bootstrap.add(securityGroup)

		for(const [ id, props ] of Object.entries(config.defaults?.http || {})) {
			const loadBalancer = new LoadBalancer(id, {
				name: `${config.name}-${id}`,
				type: 'application',
				securityGroups: [ securityGroup.id ],
				subnets: [
					bootstrap.get('public-subnet-1'),
					bootstrap.get('public-subnet-2'),
				],
			}).dependsOn(securityGroup)

			const listener = new Listener(id, {
				loadBalancerArn: loadBalancer.arn,
				port: 443,
				protocol: 'https',
				certificates: [
					bootstrap.get(`certificate-${props.domain}-arn`)
				],
				defaultActions: [
					ListenerAction.fixedResponse(404, {
						contentType: 'application/json',
						messageBody: JSON.stringify({
							message: 'Route not found'
						}),
					})
				]
			}).dependsOn(loadBalancer)

			const record = new RecordSet(`${id}-http`, {
				hostedZoneId: usEastBootstrap.import(`hosted-zone-${props.domain}-id`),
				name: props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain,
				type: 'A',
				alias: {
					hostedZoneId: loadBalancer.hostedZoneId,
					dnsName: loadBalancer.dnsName,
				}
			}).dependsOn(loadBalancer)

			bootstrap
				.add(loadBalancer, listener, record)
				.export(`http-${id}-listener-arn`, listener.arn)
		}
	},
	onStack(ctx) {
		const { stack, stackConfig, bootstrap } = ctx

		for(const [ id, routes ] of Object.entries(stackConfig.http || {})) {
			for(const [ route, props ] of Object.entries(routes)) {
				const { method, path } = parseRoute(route as Route)

				const lambda = toLambdaFunction(ctx, `http-${id}`, props!)
				const source = new ElbEventSource(`http-${id}-${route}`, lambda, {
					listenerArn: bootstrap.import(`http-${id}-listener-arn`),
					priority: generatePriority(stackConfig.name, route),
					conditions: [
						ListenerCondition.httpRequestMethods([ method ]),
						ListenerCondition.pathPatterns([ path ]),
					],
				})

				stack.add(lambda, source)
			}
		}
	},
})
