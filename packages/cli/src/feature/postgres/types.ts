import { declareTable, type TableDefinition } from '@awsless/postgres'

// What a column holds in TypeScript: what a query returns, and what an
// insert or update takes when that's wider (a bigint also takes a number).
type ValueType = { select: string; insert?: string }

const NUMBERS = ['smallint', 'int2', 'integer', 'int', 'int4', 'real', 'float4', 'double precision', 'float8']
const SERIALS = ['smallserial', 'serial', 'bigserial']
const MOMENTS = ['date', 'timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone']

// The values as the client returns them: a bigint stays text and a numeric
// is a BigFloat, so both keep their digits, and a date is a Date.
const scalarType = (type: string): ValueType => {
	if (NUMBERS.includes(type) || type === 'smallserial' || type === 'serial') {
		return { select: 'number' }
	}

	if (type === 'bigint' || type === 'int8' || type === 'bigserial') {
		return { select: 'string', insert: 'string | number | bigint' }
	}

	if (type === 'numeric' || type === 'decimal') {
		return { select: 'PostgresNumeric', insert: 'PostgresNumeric | string | number' }
	}

	if (type === 'boolean' || type === 'bool') {
		return { select: 'boolean' }
	}

	if (MOMENTS.includes(type)) {
		return { select: 'Date', insert: 'Date | string' }
	}

	if (type === 'json' || type === 'jsonb') {
		// An array has to go in as its json text: as a value it would be
		// written as a Postgres array.
		return { select: 'unknown', insert: 'string | { [key: string]: unknown }' }
	}

	if (type === 'bytea') {
		return { select: 'Uint8Array' }
	}

	// A range, a multirange & an interval can't leave a query: neither the
	// Data API nor the local client returns one. They're written as text and
	// read through a cast in sql, like days::text.
	if (type.endsWith('range') || type === 'interval') {
		return { select: 'never', insert: 'string' }
	}

	// Text, a uuid, a time, and a type an app or extension made, like an
	// enum, which a query returns as text.
	return { select: 'string' }
}

const valueType = (type: string): ValueType => {
	if (type.endsWith('[]')) {
		const item = valueType(type.slice(0, -2).trim())
		const list = (value: string) => `(${value})[]`

		return { select: list(item.select), insert: item.insert && list(item.insert) }
	}

	// A length or precision changes nothing about the value: varchar(20).
	return scalarType(type.replace(/\(.*\)$/, '').trim())
}

// A column's type for the query builder. One that fills itself (a default,
// an identity) can be left out of an insert.
export const formatColumnType = (column: ReturnType<typeof declareTable>['columns'][string]) => {
	const type = column.type.replace(/\s+/g, ' ').trim().toLowerCase()
	const value = valueType(type)
	const nullable = (text: string) => (column.nullable ? `${text} | null` : text)

	const select = nullable(value.select)
	const insert = nullable(value.insert ?? value.select)
	const isGenerated = column.default !== undefined || SERIALS.includes(type.replace(/\[\]$/, ''))

	if (column.identity) {
		return `PostgresGeneratedAlways<${select}>`
	}

	if (!value.insert) {
		return isGenerated ? `PostgresGenerated<${select}>` : select
	}

	// Written out: a generated column of a column type would not read as its value.
	return `PostgresColumn<${select}, ${isGenerated ? `${insert} | undefined` : insert}, ${insert}>`
}

// A table the way the query builder reads it: its row, a type per column.
export const formatTableType = (definition: TableDefinition, indent: string) => {
	const { columns } = declareTable(definition)

	return [
		'{',
		...Object.entries(columns).map(([column, props]) => `${indent}\t${column}: ${formatColumnType(props)}`),
		`${indent}}`,
	].join('\n')
}
