import { Client } from '@opensearch-project/opensearch'
import { AnyTable } from '../table'

export const bulkDeleteItem = <T extends AnyTable>(table: T, id: string) => {
	return {
		action: 'delete',
		table,
		id,
	} as const
}

export const bulkIndexItem = <T extends AnyTable>(table: T, id: string, item: T['schema']['INPUT']) => {
	return {
		action: 'index',
		table,
		item,
		id,
	} as const
}

export const bulkCreateItem = <T extends AnyTable>(table: T, id: string, item: T['schema']['INPUT']) => {
	return {
		action: 'create',
		table,
		item,
		id,
	} as const
}

export const bulkUpdateItem = <T extends AnyTable>(table: T, id: string, item: T['schema']['INPUT']) => {
	return {
		action: 'update',
		table,
		item,
		id,
	} as const
}

type BulkOptions = {
	items: Array<
		| {
				action: 'create' | 'update' | 'index'
				table: AnyTable
				id: string
				item: unknown
		  }
		| {
				action: 'delete'
				table: AnyTable
				id: string
		  }
	>
	client?: Client
	refresh?: boolean
}

export const bulk = async ({ items, client, refresh = true }: BulkOptions) => {
	if (items.length === 0) {
		return
	}

	const openSearchClient = client ?? items[0]!.table.client()

	const response = await openSearchClient.bulk({
		refresh,
		body: items
			.map(entry => {
				const body = [
					{
						[entry.action]: {
							_id: entry.id,
							_index: entry.table.index,
						},
					},
				]

				if (entry.action === 'create' || entry.action === 'index') {
					body.push(entry.table.schema.encode(entry.item))
				} else if (entry.action === 'update') {
					body.push({ doc: entry.table.schema.encode(entry.item) })
				}

				return body
			})
			.flat(),
	})

	if (response.body.errors) {
		throw new BulkError(findBulkItemErrors(response.body.items))
	}
}

export class BulkError extends Error {
	constructor(readonly items: BulkItemError[]) {
		super('Bulk error')
	}
}

export class BulkItemError extends Error {
	constructor(
		readonly index: string,
		readonly id: string,
		readonly type: string,
		message: string
	) {
		super(message)
	}
}

const findBulkItemErrors = (items: any[]) => {
	const errors: BulkItemError[] = []

	for (const entry of items) {
		const item = entry.delete || entry.update || entry.create || entry.index

		if (item.error) {
			errors.push(
				new BulkItemError(
					//
					item._index,
					item._id,
					item.error.type,
					item.error.reason
				)
			)
		}
	}

	return errors
}
