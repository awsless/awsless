import { searchClient } from '../client'
import { AnyTable } from '../table'
import { Client } from '@opensearch-project/opensearch'

type Options = {
	refresh?: boolean
	client?: Client
}

export const updateItem = async <T extends AnyTable>(
	table: T,
	id: string,
	item: Partial<T['schema']['INPUT']>,
	{ client = searchClient(), refresh = true }: Options = {}
) => {
	await client.update({
		index: table.index,
		id,
		body: {
			doc: table.schema.encode(item),
			doc_as_upsert: true,
		},
		refresh,
	})
}
