import { AttributeValue, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { ExpressionAttributes } from '../expression/attributes.js'
import { buildProjectionExpression, ProjectionExpression, ProjectionResponse } from '../expression/projection.js'
import { AnyTable } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { thenable, transactable } from './command.js'

export const getItem = <T extends AnyTable, const P extends ProjectionExpression<T> | undefined>(
	table: T,
	key: PrimaryKey<T>,
	options: Options & {
		consistentRead?: boolean
		select?: P
	} = {}
) => {
	const attrs = new ExpressionAttributes(table)
	const command = new GetItemCommand({
		TableName: table.name,
		Key: table.marshall(key),
		ConsistentRead: options.consistentRead,
		ProjectionExpression: buildProjectionExpression(attrs, options.select),
		...attrs.attributes(),
	})

	// console.log('GET ITEM', command.input)

	return {
		...transactable(() => ({
			unmarshall: (item: Record<string, AttributeValue>): ProjectionResponse<T, P> => table.unmarshall(item),
			input: { Get: command.input },
		})),
		...thenable<ProjectionResponse<T, P> | undefined>(async () => {
			const result = await client(options).send(command)

			if (result.Item) {
				return table.unmarshall(result.Item)
			}
		}),
	}
}
