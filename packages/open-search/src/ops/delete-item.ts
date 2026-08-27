import { isServerless } from '../client'
import { AnyTable } from '../table'

type Options = {
	refresh?: boolean
}

export const deleteItem = async <T extends AnyTable>(table: T, id: string, { refresh = true }: Options = {}) => {
	const client = table.client()

	await client.delete({
		index: table.index,
		id,
		// Serverless collections reject the refresh parameter.
		refresh: isServerless(client) ? undefined : refresh,
	})
}
