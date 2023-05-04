
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { AnyTableDefinition } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { scan } from './scan.js'

type ScanAllOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
> = Options & {
	projection?: P
	consistentRead?: boolean
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

export const scanAll = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
>(
	table: T,
	options: ScanAllOptions<T, P>
): Promise<Response> => {

	let cursor: CursorKey<T> | undefined
	let itemsProcessed = 0

	const loop = async () => {
		const result = await scan(table, {
			client: options.client,
			projection: options.projection,
			consistentRead: options.consistentRead,
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
