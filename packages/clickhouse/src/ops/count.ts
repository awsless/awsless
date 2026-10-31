import { QueryParams, Settings } from '../client'
import { quoteIdentifier } from '../param'
import { AnyTable } from '../table'

type Options = {
	where?: string
	params?: QueryParams
	final?: boolean
	settings?: Settings
}

export const count = async (table: AnyTable, { where, params, final, settings }: Options = {}) => {
	const [row] = await table
		.client()
		.query<{ count: number }>(
			`SELECT count() AS count FROM ${quoteIdentifier(table.name)}${final ? ' FINAL' : ''}${where ? ` WHERE ${where}` : ''}`,
			params,
			settings
		)

	return row?.count ?? 0
}
