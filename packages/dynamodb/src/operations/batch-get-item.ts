
import { BatchGetCommand, BatchGetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { Expression, Item, Options } from '../types.js'
import { send } from '../helper/send.js'
import { Table } from '../table.js'

export interface BatchGetOptions<F extends boolean> extends Options {
	projection?: Expression
	consistentRead?: boolean
	filterNonExistentItems?: F
}

type BatchGetItem = {
	<T extends Table<Item, keyof Item>>(
		table:T,
		keys: T['key'][],
		options?:BatchGetOptions<false>
	): Promise<(T['model'] | undefined)[]>

	<T extends Table<Item, keyof Item>>(
		table:T,
		keys: T['key'][],
		options?:BatchGetOptions<true>
	): Promise<T['model'][]>
}

export const batchGetItem:BatchGetItem = async <T extends Table<Item, keyof Item>>(
	table:T,
	keys: T['key'][],
	options:BatchGetOptions<boolean> = { filterNonExistentItems: false }
): Promise<(T['model'] | undefined)[]> => {
	let response: (T['model'] | undefined)[] = []
	let unprocessedKeys: T['key'][] = keys

	while(unprocessedKeys.length) {
		const command = new BatchGetCommand({
			RequestItems: {
				[ table.name ]: {
					Keys: unprocessedKeys,
					ConsistentRead: options.consistentRead,
					ExpressionAttributeNames: options.projection?.names,
					ProjectionExpression: options.projection?.expression,
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
