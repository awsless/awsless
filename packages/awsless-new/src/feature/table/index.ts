// import { getGlobalOnFailure } from '../on-failure/util.js'
import { aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'

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
		ctx.onAppPolicy(policy => {
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: '*',
				resourceType: 'table',
				resourceName: '*',
			})

			policy.addStatement({
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
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.tables ?? {})) {
			const group = new Node(ctx.stack, 'table', id)
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'table',
				resourceName: id,
			})

			const deletionProtection = props.deletionProtection ?? ctx.appConfig.defaults.table?.deletionProtection

			const table = new aws.dynamodb.Table(group, 'table', {
				...props,
				name,
				stream: props.stream?.type,
				deletionProtection,
			})

			// --------------------------------------------------------
			// Deletion protection

			if (deletionProtection) {
				table.deletionPolicy = 'retain'
			}

			// --------------------------------------------------------
			// Stream support

			if (props.stream) {
				const { lambda, policy } = createLambdaFunction(group, ctx, 'table', id, props.stream.consumer)

				lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

				const onFailure = getGlobalOnFailure(ctx)

				const source = new aws.lambda.EventSourceMapping(group, id, {
					functionArn: lambda.arn,
					sourceArn: table.streamArn,
					batchSize: 100,
					bisectBatchOnError: true,
					// retryAttempts: props.stream.consumer.retryAttempts ?? -1,
					parallelizationFactor: 1,
					startingPosition: 'latest',
					onFailure,
				})

				policy.addStatement(table.streamPermissions)
				source.dependsOn(policy)

				if (onFailure) {
					policy.addStatement({
						actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
						resources: [onFailure],
					})
				}

				// ctx.stack.add(lambda, source)
			}

			ctx.onStackPolicy(policy => {
				policy.addStatement(...table.permissions)
			})
		}
	},
})
