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

	console.log(response)
}
