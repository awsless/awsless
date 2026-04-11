import { putItems } from '../command/put-items'
import { AnyTable, Infer } from '../table'

export const seedTable = <T extends AnyTable>(table: T, items: Infer<T>[]) => {
	return { table, items }
}

export const seed = async (defs: ReturnType<typeof seedTable>[]) => {
	await Promise.all(
		defs.map(({ table, items }) => {
			return putItems(table, items)
		})
	)
}
