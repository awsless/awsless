
import { AnyTableDefinition, InferInput } from '../table'
import { batchPutItem } from '../operations/batch-put-item'

export const seedTable = <T extends AnyTableDefinition>(table:T, items: InferInput<T>[]) => {
	return { table, items }
}

export const seed = async (defs: ReturnType<typeof seedTable>[]) => {
	await Promise.all(defs.map(({ table, items }) => {
		return batchPutItem(table, items)
	}))
}
