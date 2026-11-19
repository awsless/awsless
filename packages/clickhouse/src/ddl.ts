import { ClickHouseClient } from './client'
import { quoteIdentifier, quoteString } from './param'

export type ColumnDefinition =
	| string
	| {
			type: string
			// An expression filling the column when an insert leaves it out.
			default?: string
			// An expression the column is always computed from.
			materialized?: string
			codec?: string
			comment?: string
	  }

// A data skipping index, like a bloom filter on a column the sort key
// doesn't cover.
export type IndexDefinition = {
	expression: string
	type: string
	granularity?: number
}

export type TableDefinition = {
	columns: Record<string, ColumnDefinition>
	engine?: string
	orderBy?: string[]
	partitionBy?: string
	primaryKey?: string[]
	ttl?: string
	indexes?: Record<string, IndexDefinition>
	settings?: Record<string, string | number | boolean>
	comment?: string
}

export type Column = Exclude<ColumnDefinition, string>

export const columnOf = (column: ColumnDefinition): Column => {
	return typeof column === 'string' ? { type: column } : column
}

export const formatSetting = (value: string | number | boolean) => {
	if (typeof value === 'string') return quoteString(value)
	if (typeof value === 'boolean') return value ? '1' : '0'

	return String(value)
}

export const formatColumn = (name: string, definition: ColumnDefinition) => {
	const column = columnOf(definition)

	return [
		quoteIdentifier(name),
		column.type,
		column.default ? `DEFAULT ${column.default}` : '',
		column.materialized ? `MATERIALIZED ${column.materialized}` : '',
		column.codec ? `CODEC(${column.codec})` : '',
		column.comment ? `COMMENT ${quoteString(column.comment)}` : '',
	]
		.filter(Boolean)
		.join(' ')
}

export const formatIndex = (name: string, index: IndexDefinition) => {
	return `INDEX ${quoteIdentifier(name)} ${index.expression} TYPE ${index.type} GRANULARITY ${index.granularity ?? 1}`
}

export const createTableStatement = (name: string, table: TableDefinition) => {
	const lines = [
		...Object.entries(table.columns).map(([column, props]) => formatColumn(column, props)),
		...Object.entries(table.indexes ?? {}).map(([index, props]) => formatIndex(index, props)),
	]

	const orderBy = table.orderBy ?? []
	const settings = Object.entries(table.settings ?? {})

	return [
		`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(name)} (\n\t${lines.join(',\n\t')}\n)`,
		`ENGINE = ${table.engine ?? 'MergeTree'}`,
		table.partitionBy ? `PARTITION BY ${table.partitionBy}` : '',
		table.primaryKey ? `PRIMARY KEY (${table.primaryKey.join(', ')})` : '',
		orderBy.length > 0 ? `ORDER BY (${orderBy.join(', ')})` : 'ORDER BY tuple()',
		table.ttl ? `TTL ${table.ttl}` : '',
		settings.length > 0
			? `SETTINGS ${settings.map(([key, value]) => `${key} = ${formatSetting(value)}`).join(', ')}`
			: '',
		table.comment ? `COMMENT ${quoteString(table.comment)}` : '',
	]
		.filter(Boolean)
		.join('\n')
}

export const dropTable = async (client: ClickHouseClient, name: string) => {
	await client.command(`DROP TABLE IF EXISTS ${quoteIdentifier(name)} SYNC`)
}
