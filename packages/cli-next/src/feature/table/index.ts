import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { constantCase } from 'change-case'
import { toSeconds } from '@awsless/duration'
import { tableOnDev } from './dev.js'
import { formatTableKeys } from './util.js'

const tableTypeGenCode = `
import { GenericMapSchema, Table as DynamoTable } from '@awsless/dynamodb'
`

export const tableFeature = defineFeature({
	name: 'table',
	onDev: tableOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		const typeValue = (value: unknown): string => JSON.stringify(value)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)
			for (const [name, props] of Object.entries(stack.tables || {})) {
				const tableName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'table',
					resourceName: name,
				})

				// The generated define only takes the runtime schema - the
				// hash, sort & index literals come from the stack config.
				const sort = props.sort ? typeValue(props.sort) : 'undefined'
				const indexes =
					props.indexes && Object.keys(props.indexes).length > 0
						? `{ ${Object.entries(props.indexes)
								.map(([indexName, index]) => {
									const indexSort = index.sort ? `; sort: ${typeValue(index.sort)}` : ''

									return `${indexName}: { hash: ${typeValue(index.hash)}${indexSort} }`
								})
								.join('; ')} }`
						: 'undefined'

				list.addType(
					name,
					`{
			readonly name: '${tableName}'
			readonly define: <S extends GenericMapSchema>(schema: S) => DynamoTable<S, ${typeValue(props.hash)}, ${sort}, ${indexes}>
		}`
				)
			}
			resources.addType(stack.name, list)
		}

		gen.addCode(tableTypeGenCode)
		gen.addInterface('TableResources', resources)

		await ctx.write('table.d.ts', gen, true)
	},
	onApp(ctx) {
		const name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: '*',
			resourceType: 'table',
			resourceName: '*',
		})

		ctx.addAppPermission({
			actions: [
				'dynamodb:DescribeTable',
				'dynamodb:PutItem',
				'dynamodb:UpdateItem',
				'dynamodb:DeleteItem',
				'dynamodb:BatchWriteItem',
				'dynamodb:GetItem',
				'dynamodb:BatchGetItem',
				'dynamodb:Scan',
				'dynamodb:Query',
				'dynamodb:ConditionCheckItem',
				'dynamodb:DescribeStream',
				'dynamodb:GetRecords',
				'dynamodb:GetShardIterator',
			],
			resources: [
				`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${name}`,
				`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${name}/index/*`,
				`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${name}/stream/*`,
			],
		})

		ctx.addAppPermission({
			actions: ['dynamodb:ListStreams'],
			resources: ['*'],
		})
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, props] of Object.entries(ctx.stackConfig.tables ?? {})) {
			const group = new Group(ctx.stack, 'table', id)
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'table',
				resourceName: id,
			})

			// App code defines tables with only a schema - the keys stay
			// single sourced in the stack config through this env.
			ctx.addEnv(
				`TABLE_${constantCase(ctx.stack.name)}_${constantCase(id)}_KEYS`,
				JSON.stringify(formatTableKeys(props))
			)

			// const deletionProtection = ctx.appConfig.removal === 'retain'

			const attributeDefinitions = () => {
				const attributes = new Set(
					[
						props.hash,
						props.sort,
						...Object.values(props.indexes ?? {}).map(index => [
							//
							index.hash,
							index.sort,
						]),
					]
						.flat(2)
						.filter(v => !!v) as string[]
				)

				const types = {
					string: 'S',
					number: 'N',
					binary: 'B',
				} as const

				return [...attributes].map(name => ({
					name: name,
					type: types[props.fields?.[name] ?? 'string'],
				}))
			}

			const table = new aws.dynamodb.Table(
				group,
				'table',
				{
					name,
					billingMode: 'PAY_PER_REQUEST',
					streamEnabled: !!props.stream,
					streamViewType: props.stream && constantCase(props.stream?.type),
					tableClass: constantCase(props.class),
					hashKey: props.hash,
					rangeKey: props.sort,
					attribute: attributeDefinitions(),
					ttl: {
						attributeName: props.ttl,
						enabled: !!props.ttl,
					},
					pointInTimeRecovery: {
						enabled: props.pointInTimeRecovery,
					},
					globalSecondaryIndex: Object.entries(props.indexes ?? {}).map(([name, index]) => ({
						name: name,
						projectionType: constantCase(index.projection),
						keySchema: [
							...index.hash.map(name => ({
								keyType: 'HASH',
								attributeName: name,
							})),
							...(index.sort ?? []).map(name => ({
								keyType: 'RANGE',
								attributeName: name,
							})),
						],
					})),
					deletionProtectionEnabled: ctx.appConfig.removal === 'retain',
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
					import: ctx.import ? name : undefined,
				}
			)

			// --------------------------------------------------------
			// Send table info to every lambda

			// ctx.addEnv(
			// 	`TABLE_${constantCase(id)}`,
			// 	JSON.stringify({
			// 		hash: props.hash,
			// 		sort: props.sort,
			// 		indexes: Object.fromEntries(
			// 			Object.entries(props.indexes ?? {}).map(([indexName, indexProps]) => {
			// 				return [
			// 					indexName,
			// 					{
			// 						hash: indexProps.hash,
			// 						sort: indexProps.sort,
			// 					},
			// 				]
			// 			})
			// 		),
			// 	})
			// )

			// --------------------------------------------------------
			// Stream support

			if (props.stream) {
				const consumer = props.stream.consumer
				const routeKey = formatRouteKey(ctx.stack.name, 'table', id)

				registerBundleFunction(ctx, routeKey, consumer)

				const onFailure = getGlobalOnFailure(ctx)

				new aws.lambda.EventSourceMapping(group, id, {
					functionName: bundle.alias.arn,
					eventSourceArn: table.streamArn,

					// tumblingWindowInSeconds
					// maximumRecordAgeInSeconds: toSeconds(props.stream.maxRecordAge),
					// bisectBatchOnFunctionError: true,

					batchSize: props.stream.batchSize,
					maximumBatchingWindowInSeconds: props.stream.batchWindow
						? toSeconds(props.stream.batchWindow)
						: undefined,
					maximumRetryAttempts: props.stream.retryAttempts,
					parallelizationFactor: props.stream.concurrencyPerShard,
					functionResponseTypes: ['ReportBatchItemFailures'],

					startingPosition: 'LATEST',
					destinationConfig: {
						onFailure: {
							destinationArn: onFailure,
						},
					},
				}, {
					dependsOn: [bundle.policy],
				})

			}
		}
	},
})
