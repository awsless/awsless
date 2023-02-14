
import { fromCursor, toCursor } from '../helper/cursor.js'
import { Table } from '../table.js'
import { Expression, Item, Options } from '../types.js'
import { query } from './query.js'

export interface PaginationOptions extends Options {
	keyCondition: Expression
	projection?: Expression
	index?: string
	consistentRead?: boolean
	limit?: number
	forward?: boolean
	cursor?: string
}

interface PaginationResponse<T extends Table<Item, keyof Item>> {
	count: number
	items: T['model'][]
	cursor?: string
}

export const pagination = async <T extends Table<Item, keyof Item>>(
	table: T,
	options:PaginationOptions
): Promise<PaginationResponse<T>> => {
	const result = await query(table, {
		...options,
		cursor: options.cursor ? fromCursor(options.cursor) : undefined
	})

	// FIX the problem where DynamoDB will return a cursor
	// even when no more items are available.

	if(result.cursor) {
		const more = await query(table, {
			...options,
			limit: 1,
			cursor: result.cursor
		})

		if(more.count === 0) {
			delete result.cursor
		}
	}

	return {
		...result,
		cursor: result.cursor && toCursor(result.cursor)
	}
}
