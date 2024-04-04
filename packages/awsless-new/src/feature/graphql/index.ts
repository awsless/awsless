// import { z } from 'zod'
// import { definePlugin } from '../../feature.js'
// import { isFunctionProps, toFunctionProps, toLambdaFunction } from '../function/index.js'
// import { toArray } from '../../util/array.js'
import { paramCase } from 'change-case'
// import { basename } from 'path'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { generate } from '@awsless/graphql'
import { buildSchema, print } from 'graphql'
import { readFile } from 'fs/promises'
// import { FunctionSchema } from '../function/schema.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { Asset, Node, aws } from '@awsless/formation'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'
import { formatFullDomainName } from '../domain/util.js'
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
			const group = new Node('graphql', id)

			ctx.base.add(group)

			const role = new aws.iam.Role('role', {
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
								resources: ['arn:aws:appsync:*:*:apis/*'],
							},
						],
					},
				],
			})

			group.add(role)

			const api = new aws.appsync.GraphQLApi('api', {
				name: formatGlobalResourceName(ctx.app.name, 'graphql', id),
				type: 'merged',
				role: role.arn,
				auth: {
					default: props.auth
						? {
								type: 'cognito',
								region: ctx.appConfig.region,
								userPoolId: ctx.app.import('base', `auth-${props.auth}-user-pool-id`),
						  }
						: {
								type: 'iam',
						  },
				},
			})

			ctx.base.export(`graphql-${id}-id`, api.id)

			group.add(api)

			// if (props.domain) {
			// 	const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

			// 	const domain = new aws.appsync.DomainName('domain', {
			// 		domainName,
			// 		certificateArn: ctx.base.import(`us-east-certificate-${props.domain}-arn`),
			// 	})

			// 	group.add(domain)

			// 	const association = new aws.appsync.DomainNameApiAssociation('association', {
			// 		apiId: api.id,
			// 		domainName: domain.domainName,
			// 	})

			// 	group.add(association)

			// 	const record = new aws.route53.RecordSet('record', {
			// 		hostedZoneId: ctx.base.import(`hosted-zone-${props.domain}-id`),
			// 		type: 'A',
			// 		name: domainName,
			// 		alias: {
			// 			dnsName: domain.appSyncDomainName,
			// 			hostedZoneId: domain.hostedZoneId,
			// 			evaluateTargetHealth: false,
			// 		},
			// 	})

			// 	group.add(record)
			// }
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.graphql ?? {})) {
			const defaultProps = ctx.appConfig.defaults.graphql?.[id]

			if (!defaultProps) {
				throw new Error(`GraphQL definition is not defined on app level for "${id}"`)
			}

			const group = new Node('graphql', id)

			ctx.stack.add(group)

			const api = new aws.appsync.GraphQLApi('api', {
				name: formatLocalResourceName(ctx.app.name, ctx.stack.name, 'graphql', id),
				visibility: false,
				auth: {
					default: {
						type: 'iam',
					},
				},
			})

			group.add(api)

			const association = new aws.appsync.SourceApiAssociation('association', {
				mergedApiId: ctx.app.import('base', `graphql-${id}-id`),
				sourceApiId: api.id,
			})

			group.add(association)

			const schema = new aws.appsync.GraphQLSchema('schema', {
				apiId: api.id,
				definition: Asset.fromFile(props.schema),
			})

			group.add(schema)

			for (const [typeName, fields] of Object.entries(props.resolvers ?? {})) {
				for (const [fieldName, props] of Object.entries(fields ?? {})) {
					const name = `${typeName}__${fieldName}`
					const resolverGroup = new Node('resolver', name)

					group.add(resolverGroup)

					const entryId = paramCase(`${id}-${typeName}-${fieldName}`)
					// const funcId = paramCase(`${id}-${shortId(`${typeName}-${fieldName}`)}`)
					const { lambda } = createLambdaFunction(resolverGroup, ctx, `graphql`, entryId, {
						...props.consumer,
						description: `${id} ${typeName}.${fieldName}`,
					})

					const role = new aws.iam.Role('source-role', {
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

					resolverGroup.add(role)

					const source = new aws.appsync.DataSource('source', {
						apiId: api.id,
						type: 'lambda',
						name,
						role: role.arn,
						functionArn: lambda.arn,
					})

					resolverGroup.add(source)

					let code: Asset = Asset.fromString(defaultResolver)

					if ('resolver' in props && props.resolver) {
						code = Asset.fromFile(props.resolver)
					}

					if (defaultProps.resolver) {
						code = Asset.fromString(defaultProps.resolver)
					}

					const config = new aws.appsync.FunctionConfiguration('config', {
						apiId: api.id,
						name,
						code,
						dataSourceName: source.name,
					})

					resolverGroup.add(config)

					const resolver = new aws.appsync.Resolver('resolver', {
						apiId: api.id,
						typeName,
						fieldName,
						functions: [config.id],
						code,
					})

					resolverGroup.add(resolver)
				}
			}
		}
	},
})
