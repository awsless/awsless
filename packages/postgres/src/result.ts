import type { ColumnMetadata, ExecuteStatementCommandOutput, Field } from '@aws-sdk/client-rds-data'
import { types } from 'pg'

// The column types the Data API returns, by the name Postgres gives them
// and their oid. Anything else has to leave the query as text.
// https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api-operations.html
const SCALARS: Record<string, number> = {
	bool: 16,
	bytea: 17,
	name: 19,
	int8: 20,
	int2: 21,
	int4: 23,
	text: 25,
	json: 114,
	cidr: 650,
	float4: 700,
	float8: 701,
	inet: 869,
	bpchar: 1042,
	varchar: 1043,
	date: 1082,
	time: 1083,
	timestamp: 1114,
	timestamptz: 1184,
	numeric: 1700,
	uuid: 2950,
	jsonb: 3802,
}

const ARRAYS: Record<string, number> = {
	_bool: 1000,
	_name: 1003,
	_int2: 1005,
	_int4: 1007,
	_text: 1009,
	_bpchar: 1014,
	_varchar: 1015,
	_int8: 1016,
	_float4: 1021,
	_float8: 1022,
	_timestamp: 1115,
	_date: 1182,
	_time: 1183,
	_json: 199,
	_numeric: 1231,
	_bit: 1561,
	_uuid: 2951,
}

// The driver behind the Data API names a column that numbers itself after
// its sequence instead of its type.
const ALIASES: Record<string, string> = {
	smallserial: 'int2',
	serial: 'int4',
	bigserial: 'int8',
}

// The oids of the types the Data API returns. A type that an app or an
// extension made isn't among them: an enum & a vector come back as text.
export const SUPPORTED_TYPES = new Set([...Object.values(SCALARS), ...Object.values(ARRAYS)])

// The first oid Postgres gives a type that an app or an extension made.
export const FIRST_OWN_OID = 16_384

type Parse = (field: Field) => unknown

// The text Postgres itself would send for a value, so pg's own parsers
// turn it into what a query over a connection returns: a bigint as a
// string, a timestamptz as a Date, json parsed.
const textOf = (field: Field | string | number | boolean | null | undefined): string | null => {
	if (field === null || field === undefined) {
		return null
	}

	if (typeof field === 'boolean') {
		return field ? 't' : 'f'
	}

	if (typeof field !== 'object') {
		return String(field)
	}

	if (field.isNull) {
		return null
	}

	return textOf(field.stringValue ?? field.longValue ?? field.doubleValue ?? field.booleanValue)
}

// The Data API writes a moment without its offset and always in UTC,
// where Postgres writes "2026-11-13 10:00:00+00".
const withOffset = (text: string) => {
	const spaced = text.replace('T', ' ').replace(/Z$/, '+00')

	return /[+-]\d\d(:?\d\d)?$/.test(spaced) ? spaced : `${spaced}+00`
}

const elementsOf = (field: Field): unknown[] | undefined => {
	const array = field.arrayValue

	return array?.stringValues ?? array?.longValues ?? array?.doubleValues ?? array?.booleanValues ?? array?.arrayValues
}

// An array as the literal Postgres writes: every element quoted, a
// missing one as NULL.
const arrayText = (elements: unknown[]) => {
	const quoted = elements.map(element => {
		const text = textOf(element as Field)

		return text === null ? 'NULL' : `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
	})

	return `{${quoted.join(',')}}`
}

const parserOf = (column: ColumnMetadata): Parse => {
	const typeName = column.typeName?.toLowerCase() ?? ''
	const name = ALIASES[typeName] ?? typeName
	const scalar = SCALARS[name]
	const array = ARRAYS[name]

	if (scalar !== undefined) {
		const parse = types.getTypeParser(scalar, 'text')

		return field => {
			if (field.blobValue) {
				return Buffer.from(field.blobValue)
			}

			const text = textOf(field)

			if (text === null) {
				return null
			}

			if (name === 'timestamptz') {
				return parse(withOffset(text))
			}

			return parse(name === 'timestamp' ? text.replace('T', ' ') : text)
		}
	}

	if (array !== undefined) {
		const parse = types.getTypeParser(array, 'text')

		return field => {
			const elements = elementsOf(field)

			return elements ? parse(arrayText(elements)) : null
		}
	}

	// A type of the app's own, like an enum: text, as over a connection.
	return field => (field.blobValue ? Buffer.from(field.blobValue) : textOf(field))
}

// The rows of a Data API answer as objects by column name, with the
// values a query over a connection gives.
export const decodeRecords = (response: Pick<ExecuteStatementCommandOutput, 'columnMetadata' | 'records'>) => {
	const columns = (response.columnMetadata ?? []).map(column => ({
		name: column.label ?? column.name ?? '',
		parse: parserOf(column),
	}))

	return (response.records ?? []).map(record => {
		const row: Record<string, unknown> = {}

		record.forEach((field, index) => {
			const column = columns[index]

			if (column) {
				row[column.name] = column.parse(field)
			}
		})

		return row
	})
}
