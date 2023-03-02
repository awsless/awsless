
import { UpdateCommand, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb'
import { BaseTable, ExpressionBuilder, MutateOptions } from '../types.js'
import { addConditionExpression, addExpression, addReturnValues, generator } from '../helper/expression.js'
import { send } from '../helper/send.js'

export interface UpdateOptions extends MutateOptions {
	update: ExpressionBuilder
}

export const updateItem = async <T extends BaseTable>(
	table: T,
	key: T['key'],
	options:UpdateOptions
): Promise<T['model'] | undefined> => {
	const gen = generator()
	const update = options.update(gen, table)
	const command = new UpdateCommand({
		TableName: table.name,
		Key: key,
		UpdateExpression: update.query,
	})

	addExpression(command.input, update)
	addReturnValues(command.input, options)
	addConditionExpression(command.input, options, gen, table)

	const result = await send(command, options) as UpdateCommandOutput

	return result.Attributes
}
