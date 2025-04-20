// import { z } from 'zod'
// import { definePlugin } from '../../feature.js'
// import { isFunctionProps, toFunctionProps, toLambdaFunction } from '../function/index.js'
// import { toArray } from '../../util/array.js'
import { kebabCase } from 'change-case'
// import { basename } from 'path'
import { generate } from '@awsless/graphql'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { readFile } from 'fs/promises'
import { buildSchema, isObjectType, print } from 'graphql'
// import { FunctionSchema } from '../function/schema.js'
import { Asset, aws, Node } from '@awsless/formation'
import { createHash } from 'crypto'
import { fingerprintFromFile } from '../../build/__fingerprint.js'
import { getBuildPath } from '../../build/index.js'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatByteSize } from '../../util/byte-size.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'
import { buildTypeScriptResolver } from './build/typescript/resolver.js'
// import { ConfigError } from '../../error.js'
// import { shortId } from '../../util/id.js'
// import { formatFullDomainName } from '../domain/util.js'

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

const baseSchema = `
type Query
type Mutation

schema {
	query: Query
	mutation: Mutation
}
`

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

export const graphqlFeature = defineFeature({
	name: 'graphql',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		const apis: Map<string, string[]> = new Map()

		for (const stack of ctx.stackConfigs) {
			for (const id of Object.keys(stack.graphql || {})) {
				apis.set(id, [])
			}
		}

		for (const stack of ctx.stackConfigs) {
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

				await ctx.write(`graphql/${id}.ts`, output)

				types.addImport({ Schema: id }, `./graphql/${id}.ts`)
				resources.addType(id, id)
			}
		}

		types.addInterface('GraphQL', resources)

		await ctx.write('graphql.d.ts', types, true)
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.graphql ?? {})) {
			const group = new Node(ctx.base, 'graphql', id)

			const role = new aws.iam.Role(group, 'role', {
				assumedBy: 'appsync.amazonaws.com',
				policies: [
					{
						name: 'merge-policy',
						statements: [
							{
								actions: [
									//
									'appsync:StartSchemaMerge',
									'appsync:SourceGraphQL',
								],
								resources: [`arn:aws:appsync:${ctx.appConfig.region}:${ctx.accountId}:apis/*`],
							},
						],
					},
				],
			})

			const api = new aws.appsync.GraphQLApi(group, 'api', {
				name: formatGlobalResourceName(ctx.app.name, 'graphql', id),
				type: 'merged',
				role: role.arn,
				auth: {
					default: props.auth
						? {
								type: 'cognito',
								region: ctx.appConfig.region,
								userPoolId: ctx.shared.get(`auth-${props.auth}-user-pool-id`),
							}
						: {
								type: 'iam',
							},
				},
			})

			ctx.shared.set(`graphql-${id}-id`, api.id)

			// if (props.auth) {
			// 	api.setDefaultAuthorization(
			// 		GraphQLAuthorization.withCognito({
			// 			userPoolId: bootstrap.import(`auth-${props.auth}-user-pool-id`),
			// 			region: bootstrap.region,
			// 			defaultAction: 'ALLOW',
			// 		})
			// 	)
			// }

			if (props.resolver) {
				ctx.registerBuild('graphql-resolver', id, async build => {
					const resolver = props.resolver!
					const version = await fingerprintFromFile(resolver)

					return build(version, async write => {
						const file = await buildTypeScriptResolver(resolver)

						if (!file) {
							throw new FileError(resolver, `Failed to build a graphql resolver.`)
						}

						await write('resolver.js', file)

						return {
							size: formatByteSize(file.byteLength),
						}
					})
				})
			}

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				const domainGroup = new Node(group, 'domain', domainName)

				const domain = new aws.appsync.DomainName(domainGroup, 'domain', {
					domainName,
					certificateArn: ctx.shared.get(`global-certificate-${props.domain}-arn`),
				})

				new aws.appsync.DomainNameApiAssociation(domainGroup, 'association', {
					apiId: api.id,
					domainName: domain.domainName,
				})

				new aws.route53.RecordSet(domainGroup, 'record', {
					hostedZoneId: ctx.shared.get(`hosted-zone-${props.domain}-id`),
					type: 'A',
					name: domainName,
					alias: {
						dnsName: domain.appSyncDomainName,
						hostedZoneId: domain.hostedZoneId,
						evaluateTargetHealth: false,
					},
				})
			}
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.graphql ?? {})) {
			const defaultProps = ctx.appConfig.defaults.graphql?.[id]

			if (!defaultProps) {
				// throw new ConfigError(ctx.stackConfig.file, )
				throw new FileError(ctx.stackConfig.file, `GraphQL definition is not defined on app level for "${id}"`)
			}

			const group = new Node(ctx.stack, 'graphql', id)

			const name = formatLocalResourceName(ctx.app.name, ctx.stack.name, 'graphql', id)

			const api = new aws.appsync.GraphQLApi(group, 'api', {
				name,
				// visibility: false,
				auth: {
					default: {
						type: 'iam',
					},
				},
			})

			ctx.registerBuild('graphql-schema', name, async build => {
				const source = await readFile(props.schema, 'utf8')
				const finger = createHash('sha1').update(source).digest('hex')

				return build(finger, async write => {
					const defs = mergeTypeDefs([scalarSchema, baseSchema, source])
					const output = print(defs)
					let schema

					try {
						schema = buildSchema(output)
					} catch (error) {
						if (error instanceof Error) {
							throw new FileError(props.schema, error.message)
						}

						throw error
					}

					for (const [typeName, fields] of Object.entries(props.resolvers ?? {})) {
						const type = schema.getType(typeName)

						if (!type || !isObjectType(type)) {
							throw new FileError(props.schema, `GraphQL schema type doesn't exist: ${typeName}`)
						}

						const typeFields = type.getFields()

						for (const fieldName of Object.keys(fields ?? {})) {
							if (!(fieldName in typeFields)) {
								throw new FileError(
									props.schema,
									`GraphQL schema field doesn't exist: ${typeName}.${fieldName}`
								)
							}
						}
					}

					await write('schema.gql', output)

					return {
						size: formatByteSize(Buffer.from(source).byteLength),
					}
				})
			})

			const schema = new aws.appsync.GraphQLSchema(group, 'schema', {
				apiId: api.id,
				definition: Asset.fromFile(getBuildPath('graphql-schema', name, 'schema.gql')),
			})

			const association = new aws.appsync.SourceApiAssociation(group, 'association', {
				mergedApiId: ctx.shared.get(`graphql-${id}-id`),
				sourceApiId: api.id,
			})

			// Association will fail without a valid schema.
			// So we need to wait on the schema.
			association.dependsOn(schema)

			for (const [typeName, fields] of Object.entries(props.resolvers ?? {})) {
				for (const [fieldName, props] of Object.entries(fields ?? {})) {
					const name = `${typeName}__${fieldName}`
					const resolverGroup = new Node(group, 'resolver', name)

					const entryId = kebabCase(`${id}-${typeName}-${fieldName}`)
					// const funcId = kebabCase(`${id}-${shortId(`${typeName}-${fieldName}`)}`)
					const { lambda } = createLambdaFunction(resolverGroup, ctx, `graphql`, entryId, {
						...props.consumer,
						description: `${id} ${typeName}.${fieldName}`,
					})

					const role = new aws.iam.Role(resolverGroup, 'source-role', {
						assumedBy: 'appsync.amazonaws.com',
						policies: [
							{
								name: 'invoke',
								statements: [
									{
										actions: ['lambda:InvokeFunction'],
										resources: [lambda.arn],
									},
								],
							},
						],
					})

					const source = new aws.appsync.DataSource(resolverGroup, 'source', {
						apiId: api.id,
						type: 'lambda',
						name,
						role: role.arn,
						functionArn: lambda.arn,
					})

					let code: Asset = Asset.fromString(defaultResolver)

					if ('resolver' in props && props.resolver) {
						code = Asset.fromFile(props.resolver)
					} else if (defaultProps.resolver) {
						code = Asset.fromFile(getBuildPath('graphql-resolver', id, 'resolver.js'))
					}

					const config = new aws.appsync.FunctionConfiguration(resolverGroup, 'config', {
						apiId: api.id,
						name,
						code,
						dataSourceName: source.name,
					})

					const resolver = new aws.appsync.Resolver(resolverGroup, 'resolver', {
						apiId: api.id,
						typeName,
						fieldName,
						functions: [config.id],
						code,
					})

					// If deploying the schema fails we might as well not deploy the resolvers.
					// Because the resolvers will always fail without the corresponding schema.
					resolver.dependsOn(schema)
				}
			}
		}
	},
})
