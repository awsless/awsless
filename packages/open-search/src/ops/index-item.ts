import { isServerless } from '../client'
import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
}

export const indexItem = async <T extends AnyTable>(
	table: T,
	id: string,
	item: T['schema']['INPUT'],
	{ refresh = true }: Options = {}
) => {
	const client = table.client()

	await client.index({
		index: table.index,
		id,
		refresh: isServerless(client) ? undefined : refresh,
		body: table.schema.encode(item),
	})
}
