
import { PutCommand, PutCommandOutput } from '@aws-sdk/lib-dynamodb'
import { BaseTable, MutateOptions } from '../types.js'
import { send } from '../helper/send.js'
import { addConditionExpression, addReturnValues, generator } from '../helper/expression.js'

export type PutOptions = MutateOptions

export const putItem = async <T extends BaseTable>(
	table: T,
	item: T['model'],
	options:PutOptions = {}
): Promise<T['model'] | undefined> => {
	const command = new PutCommand({
		TableName: table.toString(),
		Item: item,
	})

	addReturnValues(command.input, options)
	addConditionExpression(command.input, options, generator(), table)

	const result = await send(command, options) as PutCommandOutput

	return result.Attributes
}
