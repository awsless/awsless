
import { DeleteCommand, DeleteCommandOutput } from '@aws-sdk/lib-dynamodb'
import { BaseTable, MutateOptions } from '../types.js'
import { send } from '../helper/send.js'
import { addConditionExpression, addReturnValues, generator } from '../helper/expression.js'

export type DeleteOptions = MutateOptions

export const deleteItem = async <T extends BaseTable>(
	table: T,
	key: T['key'],
	options:DeleteOptions = {}
): Promise<T['model'] | undefined> => {
	const command = new DeleteCommand({
		TableName: table.name,
		Key: key,
	})

	const gen = generator()
	addReturnValues(command.input, options)
	addConditionExpression(command.input, options, gen, table)

	const result = await send(command, options) as DeleteCommandOutput

	return result.Attributes
}