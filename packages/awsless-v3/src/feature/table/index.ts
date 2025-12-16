import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { constantCase } from 'change-case'
import { toSeconds } from '@awsless/duration'

export const tableFeature = defineFeature({
	name: 'table',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)
			for (const name of Object.keys(stack.tables || {})) {
				const tableName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'table',
					resourceName: name,
				})

				list.addType(name, `'${tableName}'`)
			}
			resources.addType(stack.name, list)
		}

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
				'dynamodb:PutItem',
				'dynamodb:UpdateItem',
				'dynamodb:DeleteItem',
				'dynamodb:BatchWriteItem',
				'dynamodb:GetItem',
				'dynamodb:BatchGetItem',
				'dynamodb:Scan',
				'dynamodb:Query',
				'dynamodb:ConditionCheckItem',
			],
			resources: [
				`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${name}`,
				`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${name}/index/*`,
			],
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.tables ?? {})) {
			const group = new Group(ctx.stack, 'table', id)
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'table',
				resourceName: id,
			})

			// const deletionProtection = ctx.appConfig.removal === 'retain'

			const attributeDefinitions = () => {
				const attributes = new Set(
					[
						props.hash,
						props.sort,
						...Object.values(props.indexes ?? {}).map(index => [index.hash, index.sort]),
					]
						.flat()
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

			const table = new $.aws.dynamodb.Table(
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
						hashKey: index.hash,
						rangeKey: index.sort,
						projectionType: constantCase(index.projection),
					})),
					deletionProtectionEnabled: ctx.appConfig.removal === 'retain',
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
					import: ctx.import ? name : undefined,
				}
			)

			// await table.name

			// --------------------------------------------------------
			// Deletion protection

			// if (deletionProtection) {
			// 	table.deletionPolicy = 'retain'
			// }

			// --------------------------------------------------------
			// Stream support

			if (props.stream) {
				const result = createLambdaFunction(group, ctx, 'table', id, props.stream.consumer)

				result.setEnvironment('LOG_VIEWABLE_ERROR', '1')

				const onFailure = getGlobalOnFailure(ctx)

				new $.aws.lambda.EventSourceMapping(
					group,
					id,
					{
						functionName: result.lambda.functionName,
						eventSourceArn: table.streamArn,

						// tumblingWindowInSeconds
						// maximumRecordAgeInSeconds: props.stream.
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
					},
					{ dependsOn: [result.policy] }
				)

				result.addPermission({
					actions: [
						'dynamodb:ListStreams',
						'dynamodb:DescribeStream',
						'dynamodb:GetRecords',
						'dynamodb:GetShardIterator',
					],
					resources: [table.streamArn],
				})

				result.addPermission({
					actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
					resources: [onFailure],
				})
			}

			ctx.addStackPermission({
				actions: [
					'dynamodb:DescribeTable',
					'dynamodb:PutItem',
					'dynamodb:GetItem',
					'dynamodb:UpdateItem',
					'dynamodb:DeleteItem',
					'dynamodb:TransactWrite',
					'dynamodb:BatchWriteItem',
					'dynamodb:BatchGetItem',
					'dynamodb:ConditionCheckItem',
					'dynamodb:Query',
					'dynamodb:Scan',
				],
				resources: [table.arn],
			})

			const indexNames = Object.keys(props.indexes ?? {})

			if (indexNames.length > 0) {
				ctx.addStackPermission({
					actions: ['dynamodb:Query'],
					resources: indexNames.map(indexName => table.arn.pipe(arn => `${arn}/index/${indexName}`)),
				})
			}
		}
	},
})
