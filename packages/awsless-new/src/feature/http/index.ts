import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { Route } from './schema.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { camelCase } from 'change-case'
import { relative } from 'path'
import { directories } from '../../util/path.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'
import { shortId } from '../../util/id.js'

const parseRoute = (route: Route) => {
	const [method, ...paths] = route.split(' ') as [aws.elb.HttpRequestMethod, string]
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

export const httpFeature = defineFeature({
	name: 'http',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		const api: Record<string, Partial<Record<aws.elb.HttpRequestMethod, Record<string, string>>>> = {}

		for (const stack of ctx.stackConfigs) {
			for (const [id, routes] of Object.entries(stack.http ?? {})) {
				if (!(id in api)) api[id] = {}

				for (const [route, props] of Object.entries(routes)) {
					const { path, method } = parseRoute(route as Route)
					const file = typeof props === 'string' ? props : props!.file

					if (!(method in api[id]!)) {
						api[id]![method] = {}
					}

					api[id]![method]![path] = file
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

		await ctx.write('http.d.ts', types, true)
	},
	onApp(ctx) {
		if (Object.keys(ctx.appConfig.defaults?.http ?? {}).length === 0) {
			return
		}

		const group = new Node('http', 'main')

		ctx.base.add(group)

		const securityGroup = new aws.ec2.SecurityGroup('http', {
			vpcId: ctx.base.import(`vpc-id`),
			name: formatGlobalResourceName(ctx.app.name, 'http', 'http'),
			description: `Global security group for HTTP api.`,
		})

		const port = aws.ec2.Port.tcp(443)

		securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv4() })
		securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv6() })

		group.add(securityGroup)

		for (const [id, props] of Object.entries(ctx.appConfig.defaults?.http ?? {})) {
			const group = new Node('http', id)

			ctx.base.add(group)

			const loadBalancer = new aws.elb.LoadBalancer('balancer', {
				name: formatGlobalResourceName(ctx.app.name, 'http', id),
				type: 'application',
				securityGroups: [securityGroup.id],
				subnets: [ctx.base.import(`vpc-public-subnet-id-1`), ctx.base.import(`vpc-public-subnet-id-2`)],
			})

			group.add(loadBalancer)

			const listener = new aws.elb.Listener('listener', {
				loadBalancerArn: loadBalancer.arn,
				port: 443,
				protocol: 'https',
				certificates: [ctx.base.import(`local-certificate-${props.domain}-arn`)],
				defaultActions: [
					aws.elb.ListenerAction.fixedResponse({
						statusCode: 404,
						contentType: 'application/json',
						messageBody: JSON.stringify({
							message: 'Route not found',
						}),
					}),
				],
			})

			group.add(listener)

			const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

			const record = new aws.route53.RecordSet(domainName, {
				hostedZoneId: ctx.base.import(`hosted-zone-${props.domain}-id`),
				name: domainName,
				type: 'A',
				alias: {
					evaluateTargetHealth: false,
					hostedZoneId: loadBalancer.hostedZoneId,
					dnsName: loadBalancer.dnsName,
				},
			})

			group.add(record)

			ctx.base.export(`http-${id}-listener-arn`, listener.arn)
		}
	},
	onStack(ctx) {
		for (const [id, routes] of Object.entries(ctx.stackConfig.http ?? {})) {
			const props = ctx.appConfig.defaults.http?.[id]

			if (!props) {
				throw new Error(`Http definition is not defined on app level for "${id}"`)
			}

			const group = new Node('http', id)
			ctx.stack.add(group)

			for (const [routeKey, routeProps] of Object.entries(routes)) {
				const routeGroup = new Node('route', routeKey)
				group.add(routeGroup)

				const { method, path } = parseRoute(routeKey as Route)

				const routeId = shortId(routeKey)

				const { lambda } = createLambdaFunction(routeGroup, ctx, 'http', `${id}-${routeId}`, {
					...routeProps!,
					description: routeKey,
				})

				const name = formatLocalResourceName(ctx.app.name, ctx.stack.name, 'http', routeId)

				const permission = new aws.lambda.Permission(id, {
					action: 'lambda:InvokeFunction',
					principal: 'elasticloadbalancing.amazonaws.com',
					functionArn: lambda.arn,
					// sourceArn: `arn:aws:elasticloadbalancing:${ctx.appConfig.region}:*:targetgroup/${name}/*`,
				})

				routeGroup.add(permission)

				const target = new aws.elb.TargetGroup(id, {
					name,
					type: 'lambda',
					targets: [lambda.arn],
				}).dependsOn(permission)

				routeGroup.add(target)

				const rule = new aws.elb.ListenerRule(id, {
					listenerArn: ctx.app.import('base', `http-${id}-listener-arn`),
					priority: generatePriority(ctx.stackConfig.name, routeKey),
					conditions: [
						aws.elb.ListenerCondition.httpRequestMethods([method]),
						aws.elb.ListenerCondition.pathPatterns([path]),
					],
					actions: [aws.elb.ListenerAction.forward([target.arn])],
				}).dependsOn(target)

				routeGroup.add(rule)
			}
		}
	},
})