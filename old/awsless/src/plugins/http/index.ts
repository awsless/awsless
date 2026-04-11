import { definePlugin } from '../../plugin.js'
import { toLambdaFunction } from '../function/index.js'
import { SecurityGroup } from '../../formation/resource/ec2/security-group.js'
import { Peer } from '../../formation/resource/ec2/peer.js'
import { Port } from '../../formation/resource/ec2/port.js'
import { RecordSet } from '../../formation/resource/route53/record-set.js'
import { LoadBalancer } from '../../formation/resource/elb/load-balancer.js'
import { Listener, ListenerAction } from '../../formation/resource/elb/listener.js'
import { HttpRequestMethod, ListenerCondition } from '../../formation/resource/elb/listener-rule.js'
import { ElbEventSource } from '../../formation/resource/lambda/event-source/elb.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { relative } from 'path'
import { directories } from '../../util/path.js'
import { camelCase } from 'change-case'
import { Route } from './schema.js'
import { shortId } from '../../util/id.js'
import { formatFullDomainName } from '../domain/util.js'
import { Subnet, Vpc } from '../../formation/resource/ec2/vpc.js'

const parseRoute = (route: Route) => {
	const [method, ...paths] = route.split(' ') as [HttpRequestMethod, string]
	const path = paths.join(' ')

	return { method, path }
}

const strToInt = (str: string) => {
	return parseInt(Buffer.from(str, 'utf8').toString('hex'), 16)
}

const generatePriority = (stackName: string, route: string) => {
	const start = (strToInt(stackName) % 500) + 1
	const end = strToInt(route) % 100
	const priority = start + '' + end

	return parseInt(priority, 10)
}

export const httpPlugin = definePlugin({
	name: 'http',
	async onTypeGen({ config, write }) {
		const types = new TypeGen('@awsless/awsless/client')
		const resources = new TypeObject(1)

		const api: Record<string, Partial<Record<HttpRequestMethod, Record<string, string>>>> = {}

		for (const stack of config.stacks) {
			for (const [id, routes] of Object.entries(stack.http || {})) {
				if (!(id in api)) api[id] = {}

				for (const [route, props] of Object.entries(routes)) {
					const { path, method } = parseRoute(route as Route)
					const file = typeof props === 'string' ? props : props!.file

					if (!(method in api[id])) api[id][method] = {}
					api[id][method]![path] = file
				}
			}
		}

		for (const [id, routes] of Object.entries(api)) {
			const idType = new TypeObject(2)

			for (const [method, paths] of Object.entries(routes)) {
				const methodType = new TypeObject(3)

				for (const [path, file] of Object.entries(paths)) {
					const paramType = new TypeObject(4)

					for (const param of path.matchAll(/{([a-z0-9]+)}/g)) {
						paramType.addType(param[0], 'string | number')
					}

					const varName = camelCase(`${id}-${path}-${method}`)
					const relFile = relative(directories.types, file)

					types.addImport(varName, relFile)

					methodType.add(`'${path}'`, `Route<typeof ${varName}, ${paramType.toString() || 'never'}>`)
				}

				idType.addConst(method, methodType)
			}

			resources.addType(id, idType)
		}

		const code = [
			`import { InvokeResponse } from '@awsless/lambda'`,

			`type Function = (...args: any) => any`,
			`type Event<F extends Function> = Parameters<F>[0]`,

			`type RequestWithQuery = { request: { queryStringParameters: any } }`,
			`type RequestWithBody = { request: { body: any } }`,
			`type ResponseWithBody = { statusCode: number, body: any }`,

			`type Query<F extends Function> = Event<F> extends RequestWithQuery ? Event<F>['request']['queryStringParameters'] : never`,
			`type Body<F extends Function> = Event<F> extends RequestWithBody ? Exclude<Event<F>['request']['body'], string> : never`,
			`type Response<F extends Function> = Awaited<InvokeResponse<F>> extends ResponseWithBody ? Promise<Awaited<InvokeResponse<F>>['body']> : Promise<never>`,

			`type Route<F extends Function, P> = { param: P; query: Query<F>; body: Body<F>; response: Response<F> }`,
		]

		code.map(code => types.addCode(code))
		types.addInterface('HTTP', resources)

		await write('http.d.ts', types, true)
	},
	onApp({ config, bootstrap }) {
		if (Object.keys(config.app.defaults?.http || {}).length === 0) {
			return
		}

		const vpc = bootstrap.findByLogicalId<Vpc>('MainEc2Vpc')
		const subnet1 = bootstrap.findByLogicalId<Subnet>('Public0Ec2Subnet')
		const subnet2 = bootstrap.findByLogicalId<Subnet>('Public1Ec2Subnet')

		if (!vpc || !subnet1 || !subnet2) {
			throw new TypeError('The HTTP plugin needs a global vpc to be defined.')
		}

		const securityGroup = new SecurityGroup('http', {
			description: 'http security group',
			vpcId: vpc.id,
		}).dependsOn(vpc)

		const port = Port.tcp(443)

		securityGroup.addIngressRule(Peer.anyIpv4(), port)
		securityGroup.addIngressRule(Peer.anyIpv6(), port)

		bootstrap.add(securityGroup)

		for (const [id, props] of Object.entries(config.app.defaults?.http || {})) {
			const loadBalancer = new LoadBalancer(id, {
				name: `${config.app.name}-${id}`,
				type: 'application',
				securityGroups: [securityGroup.id],
				subnets: [subnet1.id, subnet2.id],
			}).dependsOn(securityGroup, subnet1, subnet2)

			const listener = new Listener(id, {
				loadBalancerArn: loadBalancer.arn,
				port: 443,
				protocol: 'https',
				certificates: [bootstrap.get(`certificate-${props.domain}-arn`)],
				defaultActions: [
					ListenerAction.fixedResponse(404, {
						contentType: 'application/json',
						messageBody: JSON.stringify({
							message: 'Route not found',
						}),
					}),
				],
			}).dependsOn(loadBalancer)

			// if(props.auth) {
			// 	actions.push(ListenerAction.authCognito({
			// 		// session: {
			// 		// 	cookieName: ''
			// 		// },
			// 		userPool: {
			// 			arn: bootstrap.import(`auth-${props.auth}-user-pool-arn`),
			// 			clientId: bootstrap.import(`auth-${props.auth}-client-id`),
			// 			domain: bootstrap.import(`auth-${props.auth}-domain`),
			// 		}
			// 	}))
			// }

			// if(props.auth) {
			// 	const rule = new ListenerRule(id, {
			// 		listenerArn: listener.arn,
			// 		priority: 50000,
			// 		conditions: [
			// 			ListenerCondition.pathPatterns([ '*' ]),
			// 		],
			// 		actions: [
			// 			ListenerAction.authCognito({
			// 				userPool: {
			// 					arn: bootstrap.import(`auth-${props.auth}-user-pool-arn`),
			// 					clientId: bootstrap.import(`auth-${props.auth}-client-id`),
			// 					domain: bootstrap.import(`auth-${props.auth}-domain`),
			// 				}
			// 			})
			// 		],
			// 	}).dependsOn(listener)

			// 	bootstrap.add(rule)
			// }

			const domainName = formatFullDomainName(config, props.domain, props.subDomain)

			const record = new RecordSet(`${id}-http`, {
				hostedZoneId: bootstrap.import(`hosted-zone-${props.domain}-id`),
				name: domainName,
				type: 'A',
				alias: {
					hostedZoneId: loadBalancer.hostedZoneId,
					dnsName: loadBalancer.dnsName,
				},
			}).dependsOn(loadBalancer)

			bootstrap.add(loadBalancer, listener, record).export(`http-${id}-listener-arn`, listener.arn)
		}
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bootstrap } = ctx

		for (const [id, routes] of Object.entries(stackConfig.http || {})) {
			const props = config.app.defaults.http![id]

			for (const [routeKey, routeProps] of Object.entries(routes)) {
				const { method, path } = parseRoute(routeKey as Route)
				const routeId = shortId(routeKey)

				const lambda = toLambdaFunction(ctx as any, `http-${id}`, routeProps!)
				const source = new ElbEventSource(`http-${id}-${routeId}`, lambda, {
					listenerArn: bootstrap.import(`http-${id}-listener-arn`),
					priority: generatePriority(stackConfig.name, routeKey),
					conditions: [
						ListenerCondition.httpRequestMethods([method]),
						ListenerCondition.pathPatterns([path]),
					],
					auth: props.auth
						? {
								cognito: {
									userPool: {
										arn: bootstrap.import(`auth-${props.auth}-user-pool-arn`),
										clientId: bootstrap.import(`auth-${props.auth}-client-id`),
										domain: bootstrap.import(`auth-${props.auth}-domain`),
									},
								},
						  }
						: undefined,
				})

				// if(props.auth) {
				// 	const rule = new ListenerRule(id, {
				// 		listenerArn: listener.arn,
				// 		priority: 50000,
				// 		conditions: [
				// 			ListenerCondition.pathPatterns([ '*' ]),
				// 		],
				// 		actions: [
				// 			ListenerAction.authCognito({
				// 				userPool: {
				// 					arn: bootstrap.import(`auth-${props.auth}-user-pool-arn`),
				// 					clientId: bootstrap.import(`auth-${props.auth}-client-id`),
				// 					domain: bootstrap.import(`auth-${props.auth}-domain`),
				// 				}
				// 			})
				// 		],
				// 	}).dependsOn(listener)

				// 	bootstrap.add(rule)
				// }

				stack.add(lambda, source)
			}
		}
	},
})
