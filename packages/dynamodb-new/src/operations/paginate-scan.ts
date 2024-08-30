import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { fromCursorString, toCursorString } from '../helper/cursor.js'
import { AnyTable, IndexNames } from '../table.js'
import { Options } from '../types/options.js'
import { scan } from './scan.js'

type PaginateScanOptions<
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined,
> = Options & {
	projection?: P
	index?: I
	consistentRead?: boolean
	limit?: number
	cursor?: string
}

type PaginateScanResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
	count: number
	items: ProjectionResponse<T, P>[]
	cursor?: string
}

export const paginateScan = async <
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined,
>(
	table: T,
	options: PaginateScanOptions<T, P, I> = {}
): Promise<PaginateScanResponse<T, P>> => {
	const result = await scan(table, {
		...options,
		cursor: fromCursorString<T, I>(table, options.cursor),
	})

	// FIX the problem where DynamoDB will return a cursor
	// even when no more items are available.

	if (result.cursor) {
		const more = await scan(table, {
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
