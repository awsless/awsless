import { QueryParams, Settings } from '../client'
import { quoteIdentifier } from '../param'
import { AnyTable } from '../table'

type Options = {
	// A condition with {name:Type} placeholders filled from params.
	where?: string
	params?: QueryParams
	orderBy?: string
	limit?: number
	offset?: number
	// FINAL: what a ReplacingMergeTree or SummingMergeTree holds once merged,
	// so a row inserted again doesn't show up twice.
	final?: boolean
	// Query settings, like do_not_merge_across_partitions_select_final.
	settings?: Settings
}

// Whole rows, decoded through the table's schema.
export const select = async <T extends AnyTable>(
	table: T,
	{ where, params, orderBy, limit, offset, final, settings }: Options = {}
): Promise<T['schema']['OUTPUT'][]> => {
	const columns = Object.keys(table.schema.columns).map(quoteIdentifier).join(', ')
	const sql = [
		`SELECT ${columns} FROM ${quoteIdentifier(table.name)}${final ? ' FINAL' : ''}`,
		where ? `WHERE ${where}` : '',
		orderBy ? `ORDER BY ${orderBy}` : '',
		typeof limit === 'number' ? `LIMIT ${Math.floor(limit)}` : '',
		typeof offset === 'number' ? `OFFSET ${Math.floor(offset)}` : '',
	]
		.filter(Boolean)
		.join(' ')

	const rows = await table.client().query(sql, params, settings)

	return rows.map(row => table.schema.decode(row as T['schema']['ENCODED']))
}
