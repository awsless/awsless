import { type BigFloat, parse as parseBigFloat } from '@awsless/big-float'

// A ClickHouse type as written, like `Nullable(DateTime64(3, 'UTC'))`, read
// into its name and what stands between its brackets.
export type ClickHouseType = {
	name: string
	args: string[]
}

// Splits on the commas outside brackets & quotes.
const splitArgs = (text: string) => {
	const args: string[] = []
	let depth = 0
	let quoted = false
	let current = ''

	for (let index = 0; index < text.length; index++) {
		const char = text[index]!

		if (quoted) {
			current += char

			if (char === '\\') {
				current += text[++index] ?? ''
			} else if (char === "'") {
				quoted = false
			}

			continue
		}

		if (char === "'") {
			quoted = true
		} else if (char === '(') {
			depth++
		} else if (char === ')') {
			depth--
		} else if (char === ',' && depth === 0) {
			args.push(current.trim())
			current = ''
			continue
		}

		current += char
	}

	if (current.trim()) {
		args.push(current.trim())
	}

	return args
}

export const parseType = (text: string): ClickHouseType => {
	const type = text.trim()
	const open = type.indexOf('(')

	if (open === -1 || !type.endsWith(')')) {
		return { name: type, args: [] }
	}

	return { name: type.slice(0, open).trim(), args: splitArgs(type.slice(open + 1, -1)) }
}

// The types that only wrap another one, which decides the value.
const WRAPPERS = ['LowCardinality', 'SimpleAggregateFunction']

// The type a wrapper stands for: its last argument.
export const unwrapType = (type: ClickHouseType): ClickHouseType => {
	return WRAPPERS.includes(type.name) ? unwrapType(parseType(type.args.at(-1) ?? 'String')) : type
}

// Whole numbers past what a JavaScript number holds exactly.
export const isBigInteger = (name: string) => /^U?Int(64|128|256)$/.test(name)

export const isDecimal = (name: string) => /^Decimal(32|64|128|256)?$/.test(name)

export const isDateTime = (name: string) => name === 'DateTime' || name === 'DateTime64'

// The field of a tuple: `name Type` for a named one, else the type alone.
export const tupleField = (field: string): { name?: string; type: string } => {
	const named = /^`?([A-Za-z_][A-Za-z0-9_]*)`?\s+(.+)$/s.exec(field)

	// "DateTime64(3)" has no name in front, "at DateTime64(3)" has.
	return named && !/^[A-Za-z0-9]+\s*\(/.test(field) ? { name: named[1]!, type: named[2]! } : { type: field }
}

export const tupleFieldType = (field: string) => tupleField(field).type

export type ClickHouseDecimal = BigFloat

// A value of a result in what the query builder returns for its type: a
// whole number past 2^53 as a bigint and a decimal as a BigFloat, so both
// keep every digit, a moment as a Date.
export const decodeValue = (text: string, value: unknown): unknown => {
	const type = unwrapType(parseType(text))

	if (value === null || value === undefined) {
		return value ?? null
	}

	if (type.name === 'Nullable') {
		return decodeValue(type.args[0]!, value)
	}

	if (isBigInteger(type.name)) {
		return BigInt(value as string | number)
	}

	if (isDecimal(type.name)) {
		return parseBigFloat(value as string | number)
	}

	if (isDateTime(type.name)) {
		return new Date(value as string)
	}

	if (type.name === 'Array' && Array.isArray(value)) {
		return value.map(item => decodeValue(type.args[0]!, item))
	}

	if (type.name === 'Tuple' && Array.isArray(value)) {
		return value.map((item, index) => decodeValue(tupleFieldType(type.args[index] ?? 'String'), item))
	}

	// A tuple whose fields have names comes back as an object by those names.
	if (type.name === 'Tuple' && typeof value === 'object') {
		const types = new Map(type.args.map(tupleField).map(field => [field.name, field.type]))

		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([name, item]) => {
				return [name, decodeValue(types.get(name) ?? 'String', item)]
			})
		)
	}

	if (type.name === 'Map' && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, item]) => [
				key,
				decodeValue(type.args[1]!, item),
			])
		)
	}

	return value
}
