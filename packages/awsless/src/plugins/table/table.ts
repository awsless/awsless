import { definePlugin } from '../../plugin.js'
import { Table } from '../../formation/resource/dynamodb/table.js'
import { toLambdaFunction } from '../function/index.js'
import { DynamoDBEventSource } from '../../formation/resource/lambda/event-source/dynamodb.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { formatName } from '../../formation/util.js'

export const tablePlugin = definePlugin({
	name: 'table',
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of config.stacks) {
			const list = new TypeObject(2)

			for (const name of Object.keys(stack.tables || {})) {
				const tableName = formatName(`${config.app.name}-${stack.name}-${name}`)
				list.addType(name, `'${tableName}'`)
			}

			resources.addType(stack.name, list)
		}

		gen.addInterface('TableResources', resources)

		await write('table.d.ts', gen, true)
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bind } = ctx
		for (const [id, props] of Object.entries(stackConfig.tables || {})) {
			const table = new Table(id, {
				...props,
				name: `${config.app.name}-${stack.name}-${id}`,
				stream: props.stream?.type,
			})

			stack.add(table)

			if (props.stream) {
				const lambda = toLambdaFunction(ctx, `stream-${id}`, props.stream.consumer)
				const source = new DynamoDBEventSource(id, lambda, {
					tableArn: table.arn,
					onFailure: getGlobalOnFailure(ctx),
					...props.stream,
				})

				stack.add(lambda, source)
			}

			bind(lambda => {
				lambda.addPermissions(table.permissions)
			})
		}
	},
})
