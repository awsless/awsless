import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
}

export const bulk = async <T extends AnyTable>(
	table: T,
	items: Array<
		| {
				action: 'create' | 'update' | 'index'
				id: string
				item: T['schema']['INPUT']
		  }
		| {
				action: 'delete'
				id: string
		  }
	>,
	{ refresh = true }: Options = {}
) => {
	const response = await table.client().bulk({
		index: table.index,
		refresh,
		body: items
			.map(entry => {
				const body = [{ [entry.action]: { _id: entry.id } }]

				if (entry.action === 'create' || entry.action === 'index') {
					body.push(table.schema.encode(entry.item))
				} else if (entry.action === 'update') {
					body.push({ doc: table.schema.encode(entry.item) })
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
