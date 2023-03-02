
import { ScanCommand, ScanCommandOutput } from '@aws-sdk/lib-dynamodb'
import { addProjectionExpression, generator } from '../helper/expression.js'
import { send } from '../helper/send.js'
import { Table } from '../table.js'
import { ExpressionBuilder, Item, Options } from '../types.js'

export interface ScanOptions<T extends Table<Item, keyof Item, keyof Item>> extends Options {
	projection?: ExpressionBuilder
	index?: string
	consistentRead?: boolean
	limit?: number
	cursor?: T['key']
}

export interface ScanResponse<T extends Table<Item, keyof Item, keyof Item>> {
	count: number
	items: T['model'][]
	cursor?: T['key']
}

export const scan = async <T extends Table<Item, keyof Item, keyof Item>>(
	table: T,
	options:ScanOptions<T> = {}
): Promise<ScanResponse<T>> => {
	const command = new ScanCommand({
		TableName: table.toString(),
		IndexName: options.index,
		ConsistentRead: options.consistentRead,
		Limit: options.limit || 10,
		ExclusiveStartKey: options.cursor,
	})

	addProjectionExpression(command.input, options, generator(), table)

	const result = await send(command, options) as ScanCommandOutput

	return {
		count: result.Count || 0,
		items: result.Items || [],
		cursor: result.LastEvaluatedKey
	}
}
