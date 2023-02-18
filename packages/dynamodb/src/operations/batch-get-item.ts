
import { BatchGetCommand, BatchGetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { BaseTable, ExpressionBuilder, Options } from '../types.js'
import { send } from '../helper/send.js'
import { generator } from '../helper/expression.js'

export interface BatchGetOptions<F extends boolean> extends Options {
	projection?: ExpressionBuilder
	consistentRead?: boolean
	filterNonExistentItems?: F
}

type BatchGetItem = {
	<T extends BaseTable>(
		table:T,
		keys: T['key'][],
		options?:BatchGetOptions<false>
	): Promise<(T['model'] | undefined)[]>

	<T extends BaseTable>(
		table:T,
		keys: T['key'][],
		options?:BatchGetOptions<true>
	): Promise<T['model'][]>
}

export const batchGetItem:BatchGetItem = async <T extends BaseTable>(
	table:T,
	keys: T['key'][],
	options:BatchGetOptions<boolean> = { filterNonExistentItems: false }
): Promise<(T['model'] | undefined)[]> => {
	let response: (T['model'] | undefined)[] = []
	let unprocessedKeys: T['key'][] = keys

	const projection = options.projection && options.projection(generator(), table)

	while(unprocessedKeys.length) {
		const command = new BatchGetCommand({
			RequestItems: {
				[ table.name ]: {
					Keys: unprocessedKeys,
					ConsistentRead: options.consistentRead,
					ExpressionAttributeNames: projection?.names,
					ProjectionExpression: projection?.query,
				}
			}
		})

		const result = await send(command, options) as BatchGetCommandOutput

		unprocessedKeys = ( result.UnprocessedKeys?.[ table.name ]?.Keys || [] )
		response = [ ...response, ...(result.Responses?.[ table.name ] || []) ]
	}

	if(options.filterNonExistentItems) {
		return response
	}

	return keys.map(key => {
		return response.find(item => {
			for(const i in key) {
				if(key[i] !== item?.[i]) {
					return false
				}
			}

			return true
		})
	})
}
