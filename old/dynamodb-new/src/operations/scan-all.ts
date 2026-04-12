import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { AnyTable } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { scan } from './scan.js'

type ScanAllOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = Options & {
	projection?: P
	consistentRead?: boolean
	batch: number
	cursor?: CursorKey<T>
}

export const scanAll = async function* <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(
	table: T,
	options: ScanAllOptions<T, P>
): AsyncGenerator<ProjectionResponse<T, P>[], void, void> {
	let cursor: CursorKey<T> | undefined = options.cursor
	let done = false

	const loop = async () => {
		const result = await scan(table, {
			client: options.client,
			projection: options.projection,
			consistentRead: options.consistentRead,
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
