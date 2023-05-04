
import { Combine, KeyCondition } from '../expressions/key-condition.js'
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { AnyTableDefinition, IndexNames } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { query } from './query.js'

type QueryAllOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = Options & {
	keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>
	projection?: P
	index?: I
	consistentRead?: boolean
	forward?: boolean
	batch: number
	handle: Handle<T, P>
}

type Handle<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
> = {
	(items:ProjectionResponse<T, P>[]): void | Promise<void>
}

type Response = {
	itemsProcessed: number
}

export const queryAll = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
>(
	table: T,
	options: QueryAllOptions<T, P, I>
): Promise<Response> => {

	let cursor: CursorKey<T, I> | undefined
	let itemsProcessed = 0

	const loop = async () => {
		const result = await query(table, {
			client: options.client,
			index: options.index,
			keyCondition: options.keyCondition,
			projection: options.projection,
			consistentRead: options.consistentRead,
			forward: options.forward,
			limit: options.batch,
			cursor
		})

		itemsProcessed += result.items.length

		await options.handle(result.items)

		if(result.items.length === 0 || !result.cursor) {
			return false
		}

		cursor = result.cursor
		return true
	}

	for(;;) {
		if(!await loop()) {
			break
		}
	}

	return {
		itemsProcessed
	}
}
