import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
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
			const group = new Group(ctx.base, 'rest', id)
			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'rest',
				resourceName: id,
			})

			const api = new aws.apigatewayv2.Api(group, 'api', {
				name,
				protocolType: 'HTTP',
			})

			const stage = new aws.apigatewayv2.Stage(group, 'stage', {
				name: 'v1',
				apiId: api.id,
				autoDeploy: true,
			})

			ctx.shared.add('rest', 'id', id, api.id)

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				const zoneId = ctx.shared.entry('domain', `zone-id`, props.domain)
				const certificateArn = ctx.shared.entry('domain', `certificate-arn`, props.domain)

				const domain = new aws.apigatewayv2.DomainName(group, 'domain', {
					domainName,
					domainNameConfiguration: {
						certificateArn,
						endpointType: 'REGIONAL',
						securityPolicy: 'TLS_1_2',
					},
				})

				const mapping = new aws.apigatewayv2.ApiMapping(group, 'mapping', {
					apiId: api.id,
					domainName: domain.domainName,
					stage: stage.name,
				})

				new aws.route53.Record(
					group,
					'record',
					{
						zoneId,
						type: 'A',
						name: domainName,
						alias: {
							zoneId: domain.domainNameConfiguration.pipe(v => v!.hostedZoneId),
							name: domain.domainNameConfiguration.pipe(v => v!.targetDomainName),
							evaluateTargetHealth: false,
						},
					},
					{
						dependsOn: [mapping],
					}
				)

				ctx.bind(`REST_${constantCase(id)}_ENDPOINT`, domainName)
			} else {
				ctx.bind(
					`REST_${constantCase(id)}_ENDPOINT`,
					stage.invokeUrl.pipe(url => url.split('/').slice(2).join('/'))
				)
			}
		}
	},
	onStack(ctx) {
		for (const [id, routes] of Object.entries(ctx.stackConfig.rest ?? {})) {
			const restGroup = new Group(ctx.stack, 'rest', id)

			for (const [routeKey, props] of Object.entries(routes)) {
				const group = new Group(restGroup, 'route', routeKey)
				const apiId = ctx.shared.entry('rest', 'id', id)
				const routeId = shortId(routeKey)
				const { lambda } = createLambdaFunction(
					group,
					ctx,
					'rest',
					`${id}-${routeId}`,
					{
						...props,
						description: `${id} ${routeKey}`,
					},
					{
						isManagedInstance: true,
					}
				)

				const permission = new aws.lambda.Permission(group, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 'apigateway.amazonaws.com',
					functionName: lambda.functionName,
				})

				const integration = new aws.apigatewayv2.Integration(group, 'integration', {
					apiId,
					description: `${id} ${routeKey}`,
					integrationType: 'AWS_PROXY',
					integrationMethod: 'POST',
					payloadFormatVersion: '2.0',
					integrationUri: lambda.arn.pipe(arn => {
						return `arn:aws:apigateway:${ctx.appConfig.region}:lambda:path/2015-03-31/functions/${arn}/invocations`
					}),
				})

				new aws.apigatewayv2.Route(
					group,
					'route',
					{
						apiId,
						routeKey,
						target: integration.id.pipe(id => `integrations/${id}`),
					},
					{
						dependsOn: [lambda, permission],
					}
				)
			}
		}
	},
})
