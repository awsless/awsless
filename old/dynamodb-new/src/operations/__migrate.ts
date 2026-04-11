import { AnyTable } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { batchPutItem } from './batch-put-item.js'
import { scan } from './scan.js'

type MigrateOptions<From extends AnyTable, To extends AnyTable> = Options & {
	consistentRead?: boolean
	batch?: number
	transform: TransformCallback<From, To>
}

type TransformCallback<From extends AnyTable, To extends AnyTable> = {
	(items: From['schema']['OUTPUT'][]): To['schema']['INPUT'][] | Promise<To['schema']['INPUT'][]>
}

type MigrateResponse = {
	itemsProcessed: number
}

export const migrate = async <From extends AnyTable, To extends AnyTable>(
	from: From,
	to: To,
	options: MigrateOptions<From, To>
): Promise<MigrateResponse> => {
	let cursor: CursorKey<From>
	let itemsProcessed = 0

	const loop = async () => {
		const result = await scan(from, {
			client: options.client,
			consistentRead: options.consistentRead,
			limit: options.batch || 1000,

			// @ts-ignore
			cursor,
		})

		itemsProcessed += result.items.length

		const items = await options.transform(result.items)
		await batchPutItem(to, items, { client: options.client })

		if (result.items.length === 0 || !result.cursor) {
			return false
		}

		cursor = result.cursor
		return true
	}

	for (;;) {
		if (!(await loop())) {
			break
		}
	}

	return {
		itemsProcessed,
	}
}
