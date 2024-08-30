import { batchPutItem } from '../operations/batch-put-item'
import { AnyTable, Input } from '../table'

export const seedTable = <T extends AnyTable>(table: T, items: Input<T>[]) => {
	return { table, items }
}

export const seed = async (defs: ReturnType<typeof seedTable>[]) => {
	await Promise.all(
		defs.map(({ table, items }) => {
			return batchPutItem(table, items)
		})
	)
}
