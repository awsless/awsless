import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
}

export const updateItem = async <T extends AnyTable>(
	table: T,
	id: string,
	item: Partial<T['schema']['INPUT']>,
	{ refresh = true }: Options = {}
) => {
	await table.client().update({
		index: table.index,
		id,
		body: {
			doc: table.schema.encode(item),
			doc_as_upsert: true,
		},
		refresh,
	})
}
