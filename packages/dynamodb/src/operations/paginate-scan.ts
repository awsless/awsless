
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { fromCursor, toCursor } from '../helper/cursor.js'
import { AnyTableDefinition, IndexNames } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { scan } from './scan.js'

type PaginateScanOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = Options & {
	projection?: P
	index?: I
	consistentRead?: boolean
	limit?: number
	cursor?: string
}

type PaginateScanResponse<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined
> = {
	count: number
	items: ProjectionResponse<T, P>[]
	cursor?: string
}

export const paginateScan = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined
>(
	table: T,
	options: PaginateScanOptions<T, P, I> = {}
): Promise<PaginateScanResponse<T, P>> => {
	const result = await scan(table, {
		...options,
		cursor: options.cursor ? table.unmarshall(fromCursor<CursorKey<T, I>>(options.cursor)) : undefined
	})

	// FIX the problem where DynamoDB will return a cursor
	// even when no more items are available.

	if(result.cursor) {
		const more = await scan(table, {
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
		cursor: result.cursor && toCursor(table.marshall(result.cursor))
	}
}
