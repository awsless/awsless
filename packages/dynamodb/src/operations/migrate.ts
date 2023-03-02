
import { AnyTableDefinition } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { putItem } from './put-item.js'
import { scan } from './scan.js'

type MigrateOptions<From extends AnyTableDefinition, To extends AnyTableDefinition> = Options & {
	consistentRead?: boolean
	batch?: number
	transform: TransformCallback<From, To>
}

type TransformCallback<From extends AnyTableDefinition, To extends AnyTableDefinition> = {
	(item:From['schema']['OUTPUT']): To['schema']['INPUT'] | Promise<To['schema']['INPUT']>
}

type MigrateResponse = {
	itemsProcessed: number
}

export const migrate = async <From extends AnyTableDefinition, To extends AnyTableDefinition>(
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
			cursor
		})

		await Promise.all(result.items.map(async item => {
			const newItem = await options.transform(item)
			await putItem(to, newItem, {
				client: options.client
			})

			itemsProcessed++
		}))

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
