
import { fromCursor, toCursor } from '../helper/cursor.js'
import { BaseTable, ExpressionBuilder, Options } from '../types.js'
import { query } from './query.js'

export interface PaginationOptions extends Options {
	keyCondition: ExpressionBuilder
	projection?: ExpressionBuilder
	index?: string
	consistentRead?: boolean
	limit?: number
	forward?: boolean
	cursor?: string
}

interface PaginationResponse<T extends BaseTable> {
	count: number
	items: T['model'][]
	cursor?: string
}

export const pagination = async <T extends BaseTable>(
	table: T,
	options:PaginationOptions
): Promise<PaginationResponse<T>> => {
	const result = await query(table, {
		...options,
		cursor: options.cursor ? fromCursor<T['key']>(options.cursor) : undefined
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
