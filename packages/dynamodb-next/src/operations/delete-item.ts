import { DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { ExpressionAttributes } from '../expression/attributes.js'
import { buildConditionExpression, ConditionExpression } from '../expression/condition.js'
import { ReturnResponse, ReturnValue } from '../expression/return.js'
import { AnyTable } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { thenable, transactable } from './command.js'

export const deleteItem = <T extends AnyTable, R extends ReturnValue>(
	table: T,
	key: PrimaryKey<T>,
	options: Options & {
		return?: R
		when?: ConditionExpression<T>
	} = {}
) => {
	const attrs = new ExpressionAttributes(table)
	const command = new DeleteItemCommand({
		TableName: table.name,
		Key: table.marshall(key),
		ConditionExpression: buildConditionExpression(attrs, options.when),
		ReturnValues: options.return,
		...attrs.attributes(),
	})

	return {
		...transactable(() => ({ Delete: command.input })),
		...thenable<ReturnResponse<T, R>>(async () => {
			const result = await client(options).send(command)

			if (result.Attributes) {
				return table.unmarshall(result.Attributes)
			}

			return
		}),
	}
}
