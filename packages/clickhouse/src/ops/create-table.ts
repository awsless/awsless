import { createTableStatement, TableDefinition } from '../ddl'
import { AnyTable } from '../table'

// Creates the table from its schema when it doesn't exist yet.
export const createTable = async (table: AnyTable, definition: Omit<TableDefinition, 'columns'> = {}) => {
	await table.client().command(createTableStatement(table.name, { ...definition, columns: table.schema.columns }))
}
