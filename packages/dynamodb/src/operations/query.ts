
import { QueryCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb'
import { addExpression, addProjectionExpression, generator } from '../helper/expression.js'
import { send } from '../helper/send.js'
import { BaseTable, ExpressionBuilder, Options } from '../types.js'

export interface QueryOptions<T extends BaseTable> extends Options {
	keyCondition: ExpressionBuilder
	projection?: ExpressionBuilder
	index?: string
	consistentRead?: boolean
	limit?: number
	forward?: boolean
	cursor?: T['key']
}

export interface QueryResponse<T extends BaseTable> {
	count: number
	items: T['model'][]
	cursor?: T['key']
}

export const query = async <T extends BaseTable>(
	table: T,
	options:QueryOptions<T>
): Promise<QueryResponse<T>> => {
	const { forward = true } = options
	const gen = generator()
	const keyCondition = options.keyCondition(gen, table)

	const command = new QueryCommand({
		TableName: table.name,
		IndexName: options.index,
		KeyConditionExpression: keyCondition.query,
		ConsistentRead: options.consistentRead,
		ScanIndexForward: forward,
		Limit: options.limit || 10,
		ExclusiveStartKey: options.cursor,
	})

	addExpression(command.input, keyCondition)
	addProjectionExpression(command.input, options, gen, table)

	const result = await send(command, options) as QueryCommandOutput

	return {
		count: result.Count || 0,
		items: result.Items || [],
		cursor: result.LastEvaluatedKey
	}
}
