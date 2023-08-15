
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { LocalFileSchema } from '../schema/local-file.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { toArray } from '../util/array.js';
import { paramCase } from 'change-case';
import { DurationSchema } from '../schema/duration.js';
import { GlobalExports } from '../__custom-resource/global-exports/construct.js';
import { GraphQL } from '../formation/resource/appsync/graphql-api.js';
import { RecordSet } from '../formation/resource/route53/record-set.js';
import { ref } from '../formation/util.js';
// import { DataSource } from '../formation/resource/appsync/data-source.js';
// import { Resolver } from '../formation/resource/appsync/resolver.js';
import { Schema } from '../formation/resource/appsync/schema.js';
import { Code } from '../formation/resource/appsync/code.js';
// import { FunctionConfiguration } from '../formation/resource/appsync/function-configuration.js';
import { AppsyncEventSource } from '../formation/resource/lambda/event-source/appsync.js';

const defaultResolver = `
export function request(ctx) {
	return {
		operation: 'Invoke',
		payload: ctx,
	};
}

export function response(ctx) {
	return ctx.result
}
`

const ResolverFieldSchema = z.custom<`${string} ${string}`>((value) => {
	return z.string()
		.regex(/([a-z0-9\_]+)(\s){1}([a-z0-9\_]+)/gi)
		.safeParse(value).success
}, `Invalid resolver field. Valid example: "Query list"`)

export const graphqlPlugin = definePlugin({
	name: 'graphql',
	schema: z.object({
		defaults: z.object({
			graphql: z.record(ResourceIdSchema, z.object({
				domain: z.string().optional(),
				subDomain: z.string().optional(),
				authorization: z.object({
					authorizer: FunctionSchema,
					ttl: DurationSchema.default('1 hour'),
				}).optional(),
				resolver: LocalFileSchema.optional(),
			})).optional(),
		}).default({}),

		stacks: z.object({
			graphql: z.record(ResourceIdSchema, z.object({
				schema: z.union([
					LocalFileSchema,
					z.array(LocalFileSchema).min(1),
				]).optional(),
				resolvers: z.record(ResolverFieldSchema, FunctionSchema).optional()
			})).optional()
		}).array()

	}),
	onApp(ctx) {
		const { config, bootstrap, usEastBootstrap } = ctx
		const apis:Set<string> = new Set()

		for(const stackConfig of config.stacks) {
			for(const id of Object.keys(stackConfig.graphql || {})) {
				apis.add(id)
			}
		}

		for(const id of apis) {
			const schema:string[] = []

			for(const stack of config.stacks) {
				const files = toArray(stack.graphql?.[id]?.schema || [])
				schema.push(...files)
			}

			const graphql = new GraphQL(id, {
				name: `${config.name}-${id}`,
				authenticationType: 'api-key',
				schema: new Schema(id, schema),
			})

			bootstrap
				.add(graphql)
				.export(`graphql-${id}`, graphql.api.id)

			const props = config.defaults.graphql?.[id]

			if(!props) {
				continue
			}

			if(props.authorization) {
				const lambda = toLambdaFunction(ctx as any, `${id}-authorizer`, props.authorization.authorizer)
				graphql.api.addLambdaAuthProvider(lambda.arn, props.authorization.ttl)

				bootstrap.add(lambda)
			}

			if(props.domain) {
				const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain
				const hostedZoneId = ref(`${props.domain}Route53HostedZone`)
				const certificateArn = usEastBootstrap.import(`certificate-${props.domain}-arn`)

				graphql.attachDomainName(domainName, certificateArn)

				const record = new RecordSet(id, {
					hostedZoneId,
					type: 'A',
					name: domainName,
					alias: graphql.api.dns,
				})

				bootstrap.add(record)
			}
		}
	},
	onStack(ctx) {
		const { stack, stackConfig, bootstrap } = ctx

		for(const [ id, props ] of Object.entries(stackConfig.graphql || {})) {
			const apiId = bootstrap.import(`graphql-${id}`)
			// const defaults = config.defaults.graphql?.[apiId] || {}

			for(const [ typeAndField, functionProps ] of Object.entries(props.resolvers || {})) {
				const [ typeName, fieldName ] = typeAndField.split(/[\s]+/g)
				const entryId = paramCase(`${id}-${typeName}-${fieldName}`)
				const lambda = toLambdaFunction(ctx as any, entryId, functionProps!)
				const source = new AppsyncEventSource(entryId, lambda, {
					apiId,
					typeName,
					fieldName,
					code: Code.fromInline(entryId, defaultResolver),
				})

				stack.add(lambda, source)

				// const source = DataSource.fromLambda(resolverId, apiId, lambda.arn)
				// const lambdaConf = new FunctionConfiguration(resolverId, {
				// 	apiId,
				// 	code: Code.fromInline(resolverId, defaultResolver),
				// 	dataSourceName: source.name,
				// })

				// const resolver = new Resolver(resolverId, {
				// 	apiId,
				// 	typeName,
				// 	fieldName,
				// 	functions: [ lambdaConf.arn ]
				// 	// dataSourceName: source.name,
				// 	// code: Code.fromInline(resolverId, defaultResolver),
				// 	// requestMappingTemplate: defaults.mappingTemplate?.request,
				// 	// responseMappingTemplate: defaults.mappingTemplate?.response,
				// })

				// stack.add(lambda, source, lambdaConf, resolver)
			}
		}
	},
})
