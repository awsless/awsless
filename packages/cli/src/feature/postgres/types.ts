import { declareTable, type DeclaredTable, type TableDefinition } from '@awsless/postgres'

// What a column holds in TypeScript: what a query returns, and what an
// insert or update takes when that's wider (a bigint also takes a number).
type ValueType = { select: string; insert?: string }

const NUMBERS = ['smallint', 'int2', 'integer', 'int', 'int4', 'real', 'float4', 'double precision', 'float8']
const SERIALS = ['smallserial', 'serial', 'bigserial']
const MOMENTS = ['date', 'timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone']

// Postgres' own range & multirange types. A query can't return one, nor an
// interval: neither the Data API nor the local client does.
const RANGES = ['int4', 'int8', 'num', 'ts', 'tstz', 'date'].flatMap(of => [`${of}range`, `${of}multirange`])

// The arrays the Data API returns, by the type of their items.
const RETURNED_ARRAYS = [
	...NUMBERS,
	...['bigint', 'int8', 'boolean', 'bool', 'text', 'varchar', 'character varying', 'char', 'character', 'bpchar'],
	...['numeric', 'decimal', 'date', 'time', 'time without time zone', 'timestamp', 'timestamp without time zone'],
	...['json', 'uuid', 'name', 'bit'],
]

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

	// Written as text and read through a cast in sql, like days::text.
	if (RANGES.includes(type) || type === 'interval' || type.startsWith('interval ')) {
		return { select: 'never', insert: 'string' }
	}

	// Text, a uuid, a time, and a type an app or extension made, like an
	// enum, which a query returns as text.
	return { select: 'string' }
}

// A length or precision changes nothing about the value: varchar(20),
// timestamp(3) with time zone.
const withoutPrecision = (type: string) => type.replace(/\s*\([^)]*\)/g, '').trim()

const valueType = (type: string): ValueType => {
	if (type.endsWith('[]')) {
		const of = type.slice(0, -2).trim()
		const item = valueType(of)
		const list = (value: string) => `(${value})[]`

		// An array the Data API doesn't return is read through a cast too.
		const isReturned = RETURNED_ARRAYS.includes(withoutPrecision(of))

		return {
			select: isReturned ? list(item.select) : 'never',
			insert: !isReturned || item.insert ? list(item.insert ?? item.select) : undefined,
		}
	}

	return scalarType(withoutPrecision(type))
}

// A column's type for the query builder. One that fills itself (a default,
// an identity) can be left out of an insert.
const formatColumnType = (column: DeclaredTable['columns'][string]) => {
	const type = column.type.replace(/\s+/g, ' ').trim().toLowerCase()
	const value = valueType(type)
	const nullable = (text: string) => (column.nullable ? `${text} | null` : text)

	// What can't be read is never, also where it may be NULL.
	const select = value.select === 'never' ? 'never' : nullable(value.select)
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
