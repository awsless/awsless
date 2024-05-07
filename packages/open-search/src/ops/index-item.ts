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
	await table.client().index({
		index: table.index,
		id,
		refresh,
		body: table.schema.encode(item),
	})
}
