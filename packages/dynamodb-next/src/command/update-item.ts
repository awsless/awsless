import { UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { ExpressionAttributes } from '../expression/attributes.js'
import { buildConditionExpression, ConditionExpression } from '../expression/condition.js'
import { UpdateReturnResponse, UpdateReturnValue } from '../expression/return.js'
import { buildUpdateExpression, UpdateExpression } from '../expression/update.js'
import { AnyTable } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { thenable, transactable } from './command.js'

type UpdateOptions<T extends AnyTable, R extends UpdateReturnValue> = Options & {
	update: UpdateExpression<T>
	when?: ConditionExpression<T>
	return?: R
}

export const updateItem = <T extends AnyTable, R extends UpdateReturnValue>(
	table: T,
	key: PrimaryKey<T>,
	options: UpdateOptions<T, R>
) => {
	const attrs = new ExpressionAttributes(table)
	const command = new UpdateItemCommand({
		TableName: table.name,
		Key: table.marshall(key),
		UpdateExpression: buildUpdateExpression(attrs, options.update),
		ConditionExpression: buildConditionExpression(attrs, options.when),
		ReturnValues: options.return,
		...attrs.attributes(),
	})

	// console.log('UPDATE ITEM', command.input)

	return {
		...transactable(() => ({
			Update: command.input as UpdateItemCommandInput & {
				UpdateExpression: string
			},
		})),
		...thenable<UpdateReturnResponse<T, R>>(async () => {
			const result = await client(options).send(command)

			if (result.Attributes) {
				return table.unmarshall(result.Attributes)
			}

			return
		}),
	}
}
