




import { z } from 'zod'
import { definePlugin } from '../../plugin.js';
import { toId, toName } from '../../util/resource.js';
import { FunctionSchema, toFunction } from '../function/index.js';
// import { Topic } from 'aws-cdk-lib/aws-sns';
// import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
// import { Arn, ArnFormat } from 'aws-cdk-lib';
// import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LocalFileSchema } from '../../schema/local-file.js';
import { GraphqlApi, MappingTemplate, SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { mergeTypeDefs } from '@graphql-tools/merge'

import { ResourceIdSchema } from '../../schema/resource-id.js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { toArray } from '../../util/array.js';
import { debug } from '../../cli/logger.js';
import { dirname, join } from 'path';
import { assetDir } from '../../util/path.js';
import { print } from 'graphql';
import { paramCase } from 'change-case';
import { ResolverFieldSchema } from './schema/resolver-field.js';

export const graphqlPlugin = definePlugin({
	name: 'graphql',
	schema: z.object({
		// defaults: z.object({
		// 	graphql: z.object({
		// 		authorization: FunctionSchema.optional(),
		// 	}).default({}),
		// }).default({}),

		stacks: z.object({
			graphql: z.record(ResourceIdSchema, z.object({
				schema: z.union([
					LocalFileSchema,
					z.array(LocalFileSchema).min(1),
				]).optional(),
				authorization: FunctionSchema.optional(),
				resolvers: z.record(ResolverFieldSchema, FunctionSchema).optional()
			})).optional()
		}).array()

	}),
	onBootstrap({ config, stack, assets }) {

		const list:Set<string> = new Set()

		Object.values(config.stacks).forEach(stackConfig => {
			Object.keys(stackConfig.graphql || {}).forEach(id => {
				list.add(id)
			})
		})

		list.forEach(id => {
			const file = join(assetDir, 'graphql', config.name, id, 'schema.graphql')

			assets.add({
				stack: {
					name: stack.artifactId
				},
				resource: 'graphql-schema',
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

					new GraphqlApi(stack, toId('graphql', id), {
						name: toName(stack, id),
						schema: SchemaFile.fromAsset(file),
					})
				},
			})
		})

		// const api = new GraphqlApi(stack, 'Api', {
		// 	name: 'demo',
		// 	schema: SchemaFile.fromAsset(path.join(__dirname, 'schema.graphql')),
		// 	// authorizationConfig: {
		// 	// 	defaultAuthorization: {
		// 	// 		authorizationType: AuthorizationType.LAMBDA,
		// 	// 		lambdaAuthorizerConfig: {
		// 	// 			handler,
		// 	// 		},
		// 	// 	},
		// 	// },
		// });
	},
	onStack(ctx) {
		const { stack, stackConfig } = ctx

		return Object.entries(stackConfig.graphql || {}).map(([ id, props ]) => {
			return Object.entries(props.resolvers || {}).map(([ typeAndField, functionProps ]) => {

				const api = GraphqlApi.fromGraphqlApiAttributes(stack, toId('graphql', id), {
					graphqlApiId: toId('graphql', id),
					// graphqlApiArn: toId('graphql', id),
				})

				const [ typeName, fieldName ] = typeAndField.split(/(\s)+/g)

				const functionId = paramCase(`${id}-${typeName}-${fieldName}`)
				const lambda = toFunction(ctx as any, functionId, functionProps!)
				const source = api.addLambdaDataSource(toId('data-source', functionId), lambda)

				source.createResolver(toId('resolver', functionId), {
					typeName,
					fieldName,
					requestMappingTemplate: MappingTemplate.lambdaRequest(),
					responseMappingTemplate: MappingTemplate.lambdaResult(),
				})

				return lambda
			})
		}).flat()
	},
})
