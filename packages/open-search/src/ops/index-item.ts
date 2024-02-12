import { Client } from '@opensearch-project/opensearch'
import { searchClient } from '../client'
import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
	client?: Client
}

export const indexItem = async <T extends AnyTable>(
	table: T,
	id: string,
	item: T['schema']['INPUT'],
	{ client = searchClient(), refresh = true }: Options = {}
) => {
	await client.index({
		index: table.index,
		id,
		refresh,
		body: table.schema.encode(item),
	})
}
