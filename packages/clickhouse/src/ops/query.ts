import { QueryParams, Settings } from '../client'
import { AnyTable } from '../table'

// Any sql, with the table bound to {table:Identifier}: that parameter name
// is the table's, whatever params hold. The rows come back as the server
// sent them, typed by the caller.
export const query = async <R = Record<string, unknown>>(
	table: AnyTable,
	sql: string,
	params: QueryParams = {},
	settings?: Settings
): Promise<R[]> => {
	return table.client().query<R>(sql, { ...params, table: table.name }, settings)
}
