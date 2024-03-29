import { Client } from '@opensearch-project/opensearch'
import { searchClient } from '../client'
import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
	client?: Client
}

export const deleteItem = async <T extends AnyTable>(
	table: T,
	id: string,
	{ client = searchClient(), refresh = true }: Options = {}
) => {
	await client.delete({
		index: table.index,
		id,
		refresh,
	})
}
