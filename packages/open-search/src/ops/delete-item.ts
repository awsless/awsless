import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
}

export const deleteItem = async <T extends AnyTable>(table: T, id: string, { refresh = true }: Options = {}) => {
	await table.client().delete({
		index: table.index,
		id,
		refresh,
	})
}
