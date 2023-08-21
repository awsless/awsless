
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { LocalFileSchema } from '../schema/local-file.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { toArray } from '../util/array.js';
import { paramCase } from 'change-case';
import { DurationSchema } from '../schema/duration.js';
import { GraphQLApi } from '../formation/resource/appsync/graphql-api.js';
import { RecordSet } from '../formation/resource/route53/record-set.js';
import { Definition, GraphQLSchema } from '../formation/resource/appsync/graphql-schema.js';
import { Code } from '../formation/resource/appsync/code.js';
import { AppsyncEventSource } from '../formation/resource/lambda/event-source/appsync.js';
import { DomainName, DomainNameApiAssociation } from '../formation/resource/appsync/domain-name.js';

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
			const schemaFiles:string[] = []

			for(const stack of config.stacks) {
				const files = toArray(stack.graphql?.[id]?.schema || [])
				schemaFiles.push(...files)
			}

			const api = new GraphQLApi(id, {
				name: `${config.name}-${id}`,
				authenticationType: 'api-key',
			})

			const schema = new GraphQLSchema(id, {
				apiId: api.id,
				definition: new Definition(id, schemaFiles),
			}).dependsOn(api)

			bootstrap
				.add(api)
				.add(schema)
				.export(`graphql-${id}`, api.id)

			const props = config.defaults.graphql?.[id]

			if(!props) {
				continue
			}

			if(props.authorization) {
				const lambda = toLambdaFunction(ctx as any, `${id}-authorizer`, props.authorization.authorizer)
				api.addLambdaAuthProvider(lambda.arn, props.authorization.ttl)

				bootstrap.add(lambda)
			}

			if(props.domain) {
				const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain
				const hostedZoneId = usEastBootstrap.import(`hosted-zone-${props.domain}-id`)
				const certificateArn = usEastBootstrap.import(`certificate-${props.domain}-arn`)

				const domain = new DomainName(id, {
					domainName,
					certificateArn
				})

				const association = new DomainNameApiAssociation(id, {
					apiId: api.id,
					domainName: domain.domainName,
				}).dependsOn(api, domain)

				const record = new RecordSet(`${id}-graphql`, {
					hostedZoneId,
					type: 'A',
					name: domainName,
					alias: {
						dnsName: domain.appSyncDomainName,
						hostedZoneId: domain.hostedZoneId,
					}
				}).dependsOn(domain, association)

				bootstrap.add(domain, association, record)
			}
		}
	},
	onStack(ctx) {
		const { stack, stackConfig, bootstrap } = ctx

		for(const [ id, props ] of Object.entries(stackConfig.graphql || {})) {
			const apiId = bootstrap.import(`graphql-${id}`)

			for(const [ typeAndField, functionProps ] of Object.entries(props.resolvers || {})) {
				const [ typeName, fieldName ] = typeAndField.split(/[\s]+/g)
				const entryId = paramCase(`${id}-${typeName}-${fieldName}`)
				const lambda = toLambdaFunction(ctx as any, `graphql-${entryId}`, functionProps!)
				const source = new AppsyncEventSource(entryId, lambda, {
					apiId,
					typeName,
					fieldName,
					code: Code.fromInline(entryId, defaultResolver),
				})

				stack.add(lambda, source)
			}
		}
	},
})
