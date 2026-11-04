import { InsertOptions } from '../client'
import { AnyTable } from '../table'

export const insert = async <T extends AnyTable>(table: T, rows: T['schema']['INPUT'][], options?: InsertOptions) => {
	await table.client().insert(
		table.name,
		rows.map(row => table.schema.encode(row)),
		options
	)
}
