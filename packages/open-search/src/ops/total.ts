import { AnyTable } from '../table'

export const total = async <T extends AnyTable>(table: T): Promise<number> => {
	const result = await table.client().count({
		index: table.index,
	})

	return result.body.count
}
