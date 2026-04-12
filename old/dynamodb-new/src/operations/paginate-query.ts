import { Combine, KeyCondition } from '../expressions/key-condition.js'
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { fromCursorString, toCursorString } from '../helper/cursor.js'
import { AnyTable, IndexNames } from '../table.js'
import { Options } from '../types/options.js'
import { query } from './query.js'

type PaginateQueryOptions<
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined,
> = Options & {
	keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>
	projection?: P
	index?: I
	consistentRead?: boolean
	forward?: boolean
	limit?: number
	cursor?: string
}

type PaginateQueryResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
	count: number
	items: ProjectionResponse<T, P>[]
	cursor?: string
}

export const paginateQuery = async <
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined,
>(
	table: T,
	options: PaginateQueryOptions<T, P, I>
): Promise<PaginateQueryResponse<T, P>> => {
	const result = await query(table, {
		...options,
		cursor: fromCursorString<T, I>(table, options.cursor),
	})

	// FIX the problem where DynamoDB will return a cursor
	// even when no more items are available.

	if (result.cursor) {
		const more = await query(table, {
			...options,
			limit: 1,
			cursor: result.cursor,
		})

		if (more.count === 0) {
			delete result.cursor
		}
	}

	return {
		...result,
		cursor: toCursorString<T, I>(table, result.cursor),
	}
}
