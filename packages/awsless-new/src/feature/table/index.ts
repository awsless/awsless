// import { getGlobalOnFailure } from '../on-failure/util.js'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { Node, aws } from '@awsless/formation'
import { createLambdaFunction } from '../function/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'

export const tableFeature = defineFeature({
	name: 'table',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)
			for (const name of Object.keys(stack.tables || {})) {
				const tableName = formatLocalResourceName(ctx.appConfig.name, stack.name, 'table', name)
				list.addType(name, `'${tableName}'`)
			}
			resources.addType(stack.name, list)
		}

		gen.addInterface('TableResources', resources)

		await ctx.write('table.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.tables ?? {})) {
			const group = new Node(ctx.stack, 'table', id)

			const table = new aws.dynamodb.Table(group, 'table', {
				...props,
				name: formatLocalResourceName(ctx.appConfig.name, ctx.stackConfig.name, 'table', id),
				stream: props.stream?.type,
			})

			// --------------------------------------------------------
			// Stream support

			if (props.stream) {
				const { lambda, policy } = createLambdaFunction(group, ctx, 'table', id, props.stream.consumer)

				const source = new aws.lambda.EventSourceMapping(group, id, {
					functionArn: lambda.arn,
					sourceArn: table.streamArn,
					batchSize: 100,
					bisectBatchOnError: true,
					// retryAttempts: props.stream.consumer.retryAttempts ?? -1,
					parallelizationFactor: 1,
					startingPosition: 'latest',
					onFailure: getGlobalOnFailure(ctx),
				})

				policy.addStatement(table.streamPermissions)
				source.dependsOn(policy)

				// if (onFailure) {
				// 	policy.addStatement({
				// 		actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
				// 		resources: [onFailure],
				// 	})
				// }

				// ctx.stack.add(lambda, source)
			}

			ctx.onFunction(({ policy }) => {
				policy.addStatement(...table.permissions)
			})
		}
	},
})
