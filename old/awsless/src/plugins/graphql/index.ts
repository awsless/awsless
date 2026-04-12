import { z } from 'zod'
import { definePlugin } from '../../plugin.js'
import { isFunctionProps, toFunctionProps, toLambdaFunction } from '../function/index.js'
import { toArray } from '../../util/array.js'
import { paramCase } from 'change-case'
// import { DurationSchema } from '../schema/duration.js';
import { GraphQLApi, GraphQLAuthorization } from '../../formation/resource/appsync/graphql-api.js'
import { RecordSet } from '../../formation/resource/route53/record-set.js'
import { Definition, GraphQLSchema } from '../../formation/resource/appsync/graphql-schema.js'
import { Code, ICode } from '../../formation/resource/appsync/code.js'
import { AppsyncEventSource } from '../../formation/resource/lambda/event-source/appsync.js'
import { DomainName, DomainNameApiAssociation } from '../../formation/resource/appsync/domain-name.js'
import { Asset } from '../../formation/asset.js'
import { basename } from 'path'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { generate } from '@awsless/graphql'
import { buildSchema, print } from 'graphql'
import { readFile } from 'fs/promises'
import { FunctionSchema } from '../function/schema.js'
import { shortId } from '../../util/id.js'
import { formatFullDomainName } from '../domain/util.js'

const defaultResolver = Code.fromInline(
	'graphql-default-resolver',
	`
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
)

const resolverCache = new Map<string, ICode & Asset>()

const scalarSchema = `
scalar AWSDate
scalar AWSTime
scalar AWSDateTime
scalar AWSTimestamp
scalar AWSEmail
scalar AWSJSON
scalar AWSURL
scalar AWSPhone
scalar AWSIPAddress
`

export const graphqlPlugin = definePlugin({
	name: 'graphql',
	async onTypeGen({ config, write }) {
		const types = new TypeGen('@awsless/awsless/client')
		const resources = new TypeObject(1)

		const apis: Map<string, string[]> = new Map()

		for (const stack of config.stacks) {
			for (const id of Object.keys(stack.graphql || {})) {
				apis.set(id, [])
			}
		}

		for (const stack of config.stacks) {
			for (const [id, props] of Object.entries(stack.graphql || {})) {
				if (props.schema) {
					apis.get(id)?.push(...[props.schema].flat())
				}
			}
		}

		for (const [id, files] of apis) {
			const sources = await Promise.all(
				files.map(file => {
					return readFile(file, 'utf8')
				})
			)

			if (sources.length) {
				const defs = mergeTypeDefs([scalarSchema, ...sources])
				const schema = buildSchema(print(defs))

				const output = generate(schema, {
					scalarTypes: {
						AWSDate: 'string',
						AWSTime: 'string',
						AWSDateTime: 'string',
						AWSTimestamp: 'number',
						AWSEmail: 'string',
						AWSJSON: 'string',
						AWSURL: 'string',
						AWSPhone: 'string',
						AWSIPAddress: 'string',
					},
				})

				await write(`graphql/${id}.ts`, output)

				types.addImport({ Schema: id }, `./graphql/${id}.ts`)
				resources.addType(id, id)
			}
		}

		types.addInterface('GraphQL', resources)

		await write('graphql.d.ts', types, true)
	},
	onApp(ctx) {
		const { config, bootstrap } = ctx
		const apis: Set<string> = new Set()

		for (const stackConfig of config.stacks) {
			for (const id of Object.keys(stackConfig.graphql || {})) {
				apis.add(id)
			}
		}

		for (const id of apis) {
			const schemaFiles: string[] = []

			for (const stack of config.stacks) {
				const files = toArray(stack.graphql?.[id]?.schema || [])
				schemaFiles.push(...files)
			}

			const api = new GraphQLApi(id, {
				name: `${config.app.name}-${id}`,
				defaultAuthorization: GraphQLAuthorization.withApiKey(),
			})

			const schema = new GraphQLSchema(id, {
				apiId: api.id,
				definition: new Definition(id, schemaFiles),
			}).dependsOn(api)

			bootstrap.add(api).add(schema).export(`graphql-${id}`, api.id)

			const props = config.app.defaults.graphql?.[id]

			if (!props) {
				continue
			}

			if (props.auth) {
				api.setDefaultAuthorization(
					GraphQLAuthorization.withCognito({
						userPoolId: bootstrap.import(`auth-${props.auth}-user-pool-id`),
						region: bootstrap.region,
						defaultAction: 'ALLOW',
					})
				)
			}

			// if(props.authorization) {
			// 	const lambda = toLambdaFunction(ctx as any, `${id}-authorizer`, props.authorization.authorizer)
			// 	api.addLambdaAuthProvider(lambda.arn, props.authorization.ttl)

			// 	bootstrap.add(lambda)
			// }

			if (props.domain) {
				// const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain
				const domainName = formatFullDomainName(config, props.domain, props.subDomain)
				const hostedZoneId = bootstrap.import(`hosted-zone-${props.domain}-id`)
				const certificateArn = bootstrap.import(`us-east-certificate-${props.domain}-arn`)

				// debug('DEBUG CERT', certificateArn)

				const domain = new DomainName(id, {
					domainName,
					certificateArn,
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
					},
				}).dependsOn(domain, association)

				bootstrap.add(domain, association, record)
			}
		}
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bootstrap } = ctx

		for (const [id, props] of Object.entries(stackConfig.graphql || {})) {
			const apiId = bootstrap.import(`graphql-${id}`)
			const defaultProps = config.app.defaults.graphql?.[id]

			for (const [typeName, fields] of Object.entries(props.resolvers || {})) {
				for (const [fieldName, resolverProps] of Object.entries(fields || {})) {
					const props: {
						consumer: z.output<typeof FunctionSchema>
						resolver?: string
					} = isFunctionProps(resolverProps) ? { consumer: resolverProps } : resolverProps

					const entryId = paramCase(`${id}-${typeName}-${fieldName}`)
					const funcId = paramCase(`${id}-${shortId(`${typeName}-${fieldName}`)}`)
					const lambda = toLambdaFunction(ctx as any, `graphql-${funcId}`, {
						description: entryId,
						...toFunctionProps(props.consumer),
					})

					const resolver = props.resolver ?? defaultProps?.resolver

					let code: ICode & Asset = defaultResolver

					if (resolver) {
						if (!resolverCache.has(resolver)) {
							const fileCode = Code.fromFile(basename(resolver), resolver)
							resolverCache.set(resolver, fileCode)
							stack.add(fileCode)
						}

						code = resolverCache.get(resolver)!
					}

					const source = new AppsyncEventSource(entryId, lambda, {
						apiId,
						typeName,
						fieldName,
						code,
					})

					stack.add(lambda, source)
				}
			}
		}
	},
})
