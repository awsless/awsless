import { Combine, KeyCondition } from '../expressions/key-condition.js'
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { AnyTable, IndexNames } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { query } from './query.js'

type QueryAllOptions<
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined,
> = Options & {
	keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>
	projection?: P
	index?: I
	consistentRead?: boolean
	forward?: boolean
	cursor?: CursorKey<T, I>
	batch: number
}

export const queryAll = async function* <
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined,
>(table: T, options: QueryAllOptions<T, P, I>): AsyncGenerator<ProjectionResponse<T, P>[], void, void> {
	let cursor: CursorKey<T, I> | undefined = options.cursor
	let done = false

	const loop = async () => {
		const result = await query(table, {
			client: options.client,
			index: options.index,
			keyCondition: options.keyCondition,
			projection: options.projection,
			consistentRead: options.consistentRead,
			forward: options.forward,
			limit: options.batch,
			cursor,
		})

		cursor = result.cursor

		if (result.items.length === 0 || !result.cursor) {
			done = true
		}

		return result.items
	}

	while (!done) {
		yield loop()
	}
}
