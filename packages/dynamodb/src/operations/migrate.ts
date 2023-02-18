
import { BaseTable, Item, Options } from '../types.js'
import { putItem } from './put-item.js'
import { scan, ScanResponse } from './scan.js'

export interface MigrateOptions<Old extends Item, New extends Item> extends Options {
	consistentRead?: boolean
	batch?: number
	transform: TransformCallback<Old, New>
}

export interface TransformCallback<Old extends Item, New extends Item> {
	(item:Old): New | Promise<New>
}

export interface MigrateResponse {
	itemsProcessed: number
}

export const migrate = async <From extends BaseTable, To extends BaseTable>(
	from:From,
	to:To,
	options:MigrateOptions<From['model'], To['model']>
): Promise<MigrateResponse> => {

	let cursor: From['key'] | undefined = undefined
	let itemsProcessed = 0

	for(;;){
		const result:ScanResponse<From> = await scan(from, {
			client: options.client,
			consistentRead: options.consistentRead,
			limit: options.batch || 1000,
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
			break
		}

		cursor = result.cursor
	}

	return {
		itemsProcessed
	}
}
