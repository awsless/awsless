
import { GetCommand, GetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { ExpressionBuilder, Item, Options } from '../types.js'
import { send } from '../helper/send.js'
import { Table } from '../table.js'
import { addProjectionExpression, generator } from '../helper/expression.js'

export interface GetOptions extends Options {
	consistentRead?: boolean
	projection?: ExpressionBuilder
}

export const getItem = async <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	options:GetOptions = {}
): Promise<T['model'] | undefined> => {
	const command = new GetCommand({
		TableName: table.name,
		Key: key,
		ConsistentRead: options.consistentRead
	})

	addProjectionExpression(command.input, options, generator(), table)

	const result = await send(command, options) as GetCommandOutput

	return result.Item as T['model'] | undefined
}
