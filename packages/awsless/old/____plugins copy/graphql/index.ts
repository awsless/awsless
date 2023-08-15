
import { z } from 'zod'
import { definePlugin } from '../../plugin.js';
import { toExportName, toId, toName } from '../../util/resource.js';
import { FunctionSchema, toFunction } from '../function/index.js';
import { LocalFileSchema } from '../../schema/local-file.js';
import { AuthorizationType, CfnDomainName, CfnGraphQLApi, CfnGraphQLSchema, GraphqlApi, MappingTemplate } from 'aws-cdk-lib/aws-appsync';
import { mergeTypeDefs } from '@graphql-tools/merge'

import { ResourceIdSchema } from '../../schema/resource-id.js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { toArray } from '../../util/array.js';
import { dirname, join } from 'path';
import { assetDir } from '../../util/path.js';
import { print } from 'graphql';
import { paramCase } from 'change-case';
import { ResolverFieldSchema } from './schema/resolver-field.js';
import { CfnOutput, Fn, Token } from 'aws-cdk-lib';
import { DurationSchema } from '../../schema/duration.js';
import { HostedZone, RecordSet, RecordTarget, RecordType } from 'aws-cdk-lib/aws-route53';
// import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnGraphqlApiDomainTarget } from './util/target.js';
import { GlobalExports } from '../../custom-resource/global-exports/construct.js';
// import { debug } from '../../cli/logger.js';
// import { Function } from 'aws-cdk-lib/aws-lambda';
// import { debug } from '../../cli/logger.js';

export const graphqlPlugin = definePlugin({
	name: 'graphql',
	schema: z.object({
		defaults: z.object({
			graphql: z.record(ResourceIdSchema, z.object({
				domain: z.string(),
				subDomain: z.string().optional(),
				authorization: z.object({
					authorizer: FunctionSchema,
					ttl: DurationSchema.default('1 hour'),
				}).optional(),
				mappingTemplate: z.object({
					request: LocalFileSchema.optional(),
					response: LocalFileSchema.optional(),
				}).optional()
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
	onBootstrap({ config, stack, assets }) {

		// debug('NAME', paramCase('zoé da. sil'))


		const list:Set<string> = new Set()
		// const lambdas:Function[] = []

		Object.values(config.stacks).forEach(stackConfig => {
			Object.keys(stackConfig.graphql || {}).forEach(id => {
				list.add(id)
			})
		})

		list.forEach(id => {
			const file = join(assetDir, 'graphql', config.name, id, 'schema.graphql')

			const props = config.defaults.graphql?.[id]!
			const authorization = props.authorization
			const authProps:{
				additionalAuthenticationProviders?:{
					authenticationType: AuthorizationType.LAMBDA
					lambdaAuthorizerConfig: {
						authorizerUri: string
						authorizerResultTtlInSeconds: number
					}
				}[]
			} = {}

			if(authorization) {
				const authorizer = toFunction({ config, assets, stack } as any, `${id}-authorizer`, authorization.authorizer)
				// authorizer.addToRolePolicy
				// lambdas.push(authorizer)

				authProps.additionalAuthenticationProviders = [{
					authenticationType: AuthorizationType.LAMBDA,
					lambdaAuthorizerConfig: {
						authorizerUri: authorizer.functionArn,
						authorizerResultTtlInSeconds: authorization.ttl.toSeconds(),
					}
				}]
			}

			const api = new CfnGraphQLApi(stack, toId('graphql', id), {
				...authProps,
				name: toName(stack, id),
				authenticationType: AuthorizationType.API_KEY,
			})

			new CfnOutput(stack, toId('output', id), {
				exportName: toId('graphql', id),
				value: api.attrApiId,
			})

			if(props.domain) {
				const exports = new GlobalExports(stack, toId('global-exports', id), 'us-east-1')
				const hostedZoneId = exports.importValue(toExportName(`hosted-zone-${props.domain}-id`))
				const certificateArn = exports.importValue(toExportName(`certificate-${props.domain}-arn`))
				const target = RecordTarget.fromAlias(new CfnGraphqlApiDomainTarget(api))
				const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain

				const zone = HostedZone.fromHostedZoneAttributes(
					stack,
					toId('hosted-zone-graphql', id),
					{
						hostedZoneId,
						zoneName: props.domain + '.',
					}
				)

				// const certificate = Certificate.fromCertificateArn(
				// 	stack,
				// 	toId('certificate-graphql', id),
				// 	certificateArn,
				// )

				new CfnDomainName(stack, toId('domain-name-graphql', id), {
					domainName,
					certificateArn,
				})

				new RecordSet(stack, toId('record-set-graphql', id), {
					zone,
					target,
					recordName: domainName,
					recordType: RecordType.A,
				})
			}

			assets.add({
				stackName: stack.artifactId,
				resource: 'schema',
				resourceName: id,
				async build() {
					const schemas:string[] = []

					await Promise.all(Object.values(config.stacks).map(async stackConfig => {
						const schemaFiles:string[] = toArray(stackConfig.graphql?.[id].schema || [])
						await Promise.all(schemaFiles.map(async schemaFile => {
							const schema = await readFile(schemaFile, 'utf8')
							schemas.push(schema)
						}))
					}))

					const schema = print(mergeTypeDefs(schemas))

					await mkdir(dirname(file), { recursive: true })
					await writeFile(file, schema)

					new CfnGraphQLSchema(stack, toId('schema', id), {
						apiId: api.attrApiId,
						definition: schema,
					})
				},
			})
		})

		// return lambdas
	},
	onStack(ctx) {
		const { config, stack, stackConfig } = ctx

		return Object.entries(stackConfig.graphql || {}).map(([ id, props ]) => {
			const defaults = config.defaults.graphql?.[id]! || {}

			return Object.entries(props.resolvers || {}).map(([ typeAndField, functionProps ]) => {

				const api = GraphqlApi.fromGraphqlApiAttributes(stack, toId('graphql', id), {
					graphqlApiId: Fn.importValue(toId('graphql', id)),
				})

				const [ typeName, fieldName ] = typeAndField.split(/[\s]+/g)
				const functionId = paramCase(`${id}-${typeName}-${fieldName}`)
				const lambda = toFunction(ctx as any, functionId, functionProps!)
				const source = api.addLambdaDataSource(toId('data-source', functionId), lambda, {
					name: toId('data-source', functionId)
				})

				source.createResolver(toId('resolver', functionId), {
					typeName,
					fieldName,
					requestMappingTemplate: defaults.mappingTemplate?.request
						? MappingTemplate.fromFile(defaults.mappingTemplate.request)
						: MappingTemplate.lambdaRequest(),
					responseMappingTemplate: defaults.mappingTemplate?.response
						? MappingTemplate.fromFile(defaults.mappingTemplate.response)
						: MappingTemplate.lambdaResult(),
				})

				return lambda
			})
		}).flat()
	},
})
