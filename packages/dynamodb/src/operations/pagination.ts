
import { Combine, KeyCondition } from '../expressions/key-condition.js'
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { fromCursor, toCursor } from '../helper/cursor.js'
import { AnyTableDefinition, IndexNames } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { query } from './query.js'

type PaginationOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = Options & {
	keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>
	projection?: P
	index?: I
	consistentRead?: boolean
	forward?: boolean
	limit?: number
	cursor?: string
}

type PaginationResponse<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined
> = {
	count: number
	items: ProjectionResponse<T, P>[]
	cursor?: string
}

export const pagination = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined
>(
	table: T,
	options: PaginationOptions<T, P, I>
): Promise<PaginationResponse<T, P>> => {
	const result = await query(table, {
		...options,
		cursor: options.cursor ? fromCursor<CursorKey<T, I>>(options.cursor) : undefined
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
