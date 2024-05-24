import { aws, Node } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'

export const restFeature = defineFeature({
	name: 'rest',
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults?.rest ?? {})) {
			const group = new Node(ctx.base, 'rest', id)

			const api = new aws.apiGatewayV2.Api(group, 'api', {
				name: formatGlobalResourceName(ctx.app.name, 'rest', id),
				protocolType: 'HTTP',
			})

			const stage = new aws.apiGatewayV2.Stage(group, 'stage', {
				name: 'v1',
				apiId: api.id,
			})

			ctx.shared.set(`rest-${id}-id`, api.id)

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				const hostedZoneId = ctx.shared.get<string>(`hosted-zone-${props.domain}-id`)
				const certificateArn = ctx.shared.get<aws.ARN>(`certificate-${props.domain}-arn`)

				const domain = new aws.apiGatewayV2.DomainName(group, 'domain', {
					name: domainName,
					certificates: [
						{
							certificateArn,
						},
					],
				})

				const mapping = new aws.apiGatewayV2.ApiMapping(group, 'mapping', {
					apiId: api.id,
					domainName: domain.name,
					stage: stage.name,
				})

				const record = new aws.route53.RecordSet(group, 'record', {
					hostedZoneId,
					type: 'A',
					name: domainName,
					alias: {
						dnsName: domain.regionalDomainName,
						hostedZoneId: domain.regionalHostedZoneId,
						evaluateTargetHealth: false,
					},
				})

				record.dependsOn(domain, mapping)

				ctx.bindEnv(`REST_${constantCase(id)}_ENDPOINT`, domainName)
			} else {
				// We should also export a env binding for when we don't use a domain.
			}
		}
	},
	onStack(ctx) {
		for (const [id, routes] of Object.entries(ctx.stackConfig.rest ?? {})) {
			const restGroup = new Node(ctx.stack, 'rest', id)

			for (const [routeKey, props] of Object.entries(routes)) {
				const group = new Node(restGroup, 'route', routeKey)
				const apiId = ctx.shared.get<string>(`rest-${id}-id`)
				const routeId = shortId(routeKey)
				const { lambda } = createLambdaFunction(group, ctx, 'rest', `${id}-${routeId}`, {
					...props,
					description: `${id} ${routeKey}`,
				})

				const permission = new aws.lambda.Permission(group, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 'apigateway.amazonaws.com',
					functionArn: lambda.arn,
				})

				const integration = new aws.apiGatewayV2.Integration(group, 'integration', {
					apiId,
					description: `${id} ${routeKey}`,
					method: 'POST',
					payloadFormatVersion: '2.0',
					type: 'AWS_PROXY',
					uri: lambda.arn.apply(arn => {
						return `arn:aws:apigateway:${ctx.appConfig.region}:lambda:path/2015-03-31/functions/${arn}/invocations`
					}),
				})

				const route = new aws.apiGatewayV2.Route(group, 'route', {
					apiId,
					routeKey,
					target: integration.id.apply(id => `integrations/${id}`),
				})

				route.dependsOn(lambda, permission)
			}
		}
	},
})
