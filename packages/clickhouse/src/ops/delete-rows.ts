import { QueryParams } from '../client'
import { quoteIdentifier } from '../param'
import { AnyTable } from '../table'

type Options = {
	where: string
	params?: QueryParams
}

// A lightweight delete: the rows disappear from queries right away & are
// removed from disk with the next merges.
export const deleteRows = async (table: AnyTable, { where, params }: Options) => {
	await table.client().command(`DELETE FROM ${quoteIdentifier(table.name)} WHERE ${where}`, params)
}
