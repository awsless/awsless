import { type BigFloat, parse as parseBigFloat } from '@awsless/big-float'
import { parse as parseJson, stringify } from '@awsless/json'
import { types } from 'pg'
import { createError } from './transport'

// How values cross between TypeScript and Postgres, the same over a
// connection and through the Data API: a numeric is a BigFloat, so it
// keeps every digit, and a json document goes through @awsless/json, so
// what it holds (a BigFloat, a Date, a Set) comes back as it went in.

export type { BigFloat as PostgresNumeric }

const NUMERIC = 1700
const NUMERIC_ARRAY = 1231
const JSON_TYPES = [114, 3802]
const JSON_ARRAYS = [199, 3807]
const TEXT_ARRAY = 1009

type Parse = (text: string) => unknown

const parseNumeric: Parse = text => {
	try {
		return parseBigFloat(text)
	} catch {
		// NaN & Infinity are numerics too.
		throw createError(
			'22003',
			`A numeric of ${text} can't be read as a BigFloat. Cast it to text in the query, like amount::text.`
		)
	}
}

// An array, also one of arrays, with every value read on its own.
const parseArray = (parse: Parse): Parse => {
	const parseTexts = types.getTypeParser(TEXT_ARRAY as number, 'text') as Parse
	const each = (value: unknown): unknown => {
		return Array.isArray(value) ? value.map(each) : value === null ? null : parse(value as string)
	}

	return text => each(parseTexts(text))
}

const parsers = new Map<number, Parse>([
	[NUMERIC, parseNumeric],
	[NUMERIC_ARRAY, parseArray(parseNumeric)],
	...JSON_TYPES.map(oid => [oid, parseJson] as [number, Parse]),
	...JSON_ARRAYS.map(oid => [oid, parseArray(parseJson)] as [number, Parse]),
])

// The parser of a column type, by its oid: pg's own for all but the above.
export const getTypeParser = (oid: number, format: 'text' | 'binary' = 'text'): Parse => {
	return (format === 'text' && parsers.get(oid)) || (types.getTypeParser(oid, format as 'text') as Parse)
}

// For a pg query: `{ text, values, types: valueTypes }`.
export const valueTypes = { getTypeParser }

// By its shape, not its class: an app can hold a second copy of the package.
const isBigFloat = (value: object): value is BigFloat => {
	const { coefficient, exponent } = value as Partial<BigFloat>

	return typeof coefficient === 'bigint' && typeof exponent === 'number'
}

// What pg sends as it is, or knows how to write itself.
const isPlain = (value: object) => {
	return (
		value instanceof Date ||
		ArrayBuffer.isView(value) ||
		value instanceof ArrayBuffer ||
		typeof (value as { toPostgres?: unknown }).toPostgres === 'function'
	)
}

// A parameter the way Postgres reads it. An array stays an array, for an
// array column; any other object is a json document.
export const prepareParam = (value: unknown): unknown => {
	if (value === null || typeof value !== 'object' || isPlain(value)) {
		return value
	}

	if (isBigFloat(value)) {
		return value.toString()
	}

	if (Array.isArray(value)) {
		return value.map(prepareParam)
	}

	return stringify(value)
}

export const prepareParams = (params?: unknown[]) => params?.map(prepareParam)
