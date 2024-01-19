import { z } from 'zod'
import { definePlugin } from '../plugin.js'
import { ResourceIdSchema } from '../config/schema/resource-id.js'
import { FunctionSchema, toLambdaFunction } from './function.js'
import { RecordSet } from '../formation/resource/route53/record-set.js'
import { RouteSchema } from '../config/schema/route.js'
import { Api } from '../formation/resource/api-gateway-v2/api.js'
import { ApiGatewayV2EventSource } from '../formation/resource/lambda/event-source/api-gateway-v2.js'
import { DomainName } from '../formation/resource/api-gateway-v2/domain-name.js'
import { Stage } from '../formation/resource/api-gateway-v2/stage.js'
import { ApiMapping } from '../formation/resource/api-gateway-v2/api-mapping.js'

export const restPlugin = definePlugin({
	name: 'rest',
	schema: z.object({
		defaults: z
			.object({
				/** Define your global REST API's.
				 * @example
				 * {
				 *   rest: {
				 *     REST_API_NAME: {
				 *       domain: 'example.com',
				 *       subDomain: 'api',
				 *     }
				 *   }
				 * }
				 */
				rest: z
					.record(
						ResourceIdSchema,
						z.object({
							/** The domain to link your API with. */
							domain: z.string(),
							subDomain: z.string().optional(),
						})
					)
					.optional(),
			})
			.default({}),
		stacks: z
			.object({
				/** Define routes in your stack for your global REST API.
				 * @example
				 * {
				 *   rest: {
				 *     REST_API_NAME: {
				 *       'GET /': 'index.ts',
				 *       'POST /posts': 'create-post.ts',
				 *     }
				 *   }
				 * }
				 */
				rest: z.record(ResourceIdSchema, z.record(RouteSchema, FunctionSchema)).optional(),
			})
			.array(),
	}),
	onApp({ config, bootstrap }) {
		for (const [id, props] of Object.entries(config.defaults?.rest || {})) {
			const api = new Api(id, {
				name: `${config.name}-${id}`,
				protocolType: 'HTTP',
			})

			const stage = new Stage(id, {
				name: 'v1',
				apiId: api.id,
			}).dependsOn(api)

			bootstrap.add(api, stage).export(`rest-${id}-id`, api.id)

			if (props.domain) {
				const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain
				const hostedZoneId = bootstrap.import(`hosted-zone-${props.domain}-id`)
				const certificateArn = bootstrap.import(`certificate-${props.domain}-arn`)

				const domain = new DomainName(id, {
					name: domainName,
					certificateArn,
				})

				const mapping = new ApiMapping(id, {
					apiId: api.id,
					domainName: domain.name,
					stage: stage.name,
				}).dependsOn(api, domain, stage)

				const record = new RecordSet(`rest-${id}`, {
					hostedZoneId,
					type: 'A',
					name: domainName,
					alias: {
						dnsName: domain.regionalDomainName,
						hostedZoneId: domain.regionalHostedZoneId,
					},
				}).dependsOn(domain, mapping)

				bootstrap.add(domain, mapping, record)
			}
		}
	},
	onStack(ctx) {
		const { stack, stackConfig, bootstrap } = ctx

		for (const [id, routes] of Object.entries(stackConfig.rest || {})) {
			for (const [routeKey, props] of Object.entries(routes)) {
				const lambda = toLambdaFunction(ctx as any, `rest-${id}-${routeKey}`, props!)
				const source = new ApiGatewayV2EventSource(`rest-${id}-${routeKey}`, lambda, {
					apiId: bootstrap.import(`rest-${id}-id`),
					routeKey,
				})

				stack.add(lambda, source)
			}
		}
	},
})
