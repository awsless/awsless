import {
	badQueryParameter,
	cannotParseDateTime,
	cannotParseNumber,
	cannotParseText,
	cannotParseUuid,
	unknownElementOfEnum,
	unknownType,
} from './errors'
import { Token, tokenize } from './lexer'
import { dayNumberIn, formatDateTime as formatLocal, formatDay, fromParts, isTimeZone, partsToDay } from './time'
import { DateTimeValue, DateValue, isNumeric, normalizeNumber, toNumber, TupleValue, Value } from './values'

export type DataType =
	| { name: 'Nullable'; inner: DataType }
	| { name: 'LowCardinality'; inner: DataType }
	| { name: 'Array'; inner: DataType }
	| { name: 'Map'; key: DataType; value: DataType }
	| { name: 'Tuple'; items: DataType[]; names?: string[] }
	| { name: 'Enum8' | 'Enum16'; values: [string, number][] }
	| { name: 'DateTime'; timeZone?: string }
	| { name: 'DateTime64'; scale: number; timeZone?: string }
	| { name: 'Decimal'; precision: number; scale: number }
	| { name: 'FixedString'; length: number }
	| { name: 'Interval'; unit: string }
	| { name: SimpleType }

export type SimpleType =
	| 'Int8'
	| 'Int16'
	| 'Int32'
	| 'Int64'
	| 'Int128'
	| 'Int256'
	| 'UInt8'
	| 'UInt16'
	| 'UInt32'
	| 'UInt64'
	| 'UInt128'
	| 'UInt256'
	| 'Float32'
	| 'Float64'
	| 'BFloat16'
	| 'String'
	| 'Bool'
	| 'UUID'
	| 'Date'
	| 'Date32'
	| 'IPv4'
	| 'IPv6'
	| 'JSON'
	| 'Dynamic'
	| 'Nothing'

const SIMPLE: SimpleType[] = [
	'Int8',
	'Int16',
	'Int32',
	'Int64',
	'Int128',
	'Int256',
	'UInt8',
	'UInt16',
	'UInt32',
	'UInt64',
	'UInt128',
	'UInt256',
	'Float32',
	'Float64',
	'BFloat16',
	'String',
	'Bool',
	'UUID',
	'Date',
	'Date32',
	'IPv4',
	'IPv6',
	'JSON',
	'Dynamic',
	'Nothing',
]

// The SQL names ClickHouse accepts for its own types, case-insensitive.
const ALIASES: Record<string, string> = {
	INT: 'Int32',
	INTEGER: 'Int32',
	INT1: 'Int8',
	TINYINT: 'Int8',
	BYTE: 'Int8',
	SMALLINT: 'Int16',
	INT2: 'Int16',
	INT4: 'Int32',
	MEDIUMINT: 'Int32',
	BIGINT: 'Int64',
	INT8: 'Int64',
	SIGNED: 'Int64',
	UNSIGNED: 'UInt64',
	FLOAT: 'Float32',
	REAL: 'Float32',
	SINGLE: 'Float32',
	DOUBLE: 'Float64',
	TEXT: 'String',
	VARCHAR: 'String',
	CHAR: 'String',
	NCHAR: 'String',
	NVARCHAR: 'String',
	CLOB: 'String',
	BLOB: 'String',
	BYTEA: 'String',
	LONGTEXT: 'String',
	MEDIUMTEXT: 'String',
	TINYTEXT: 'String',
	BINARY: 'FixedString',
	BOOLEAN: 'Bool',
	BOOL: 'Bool',
	TIMESTAMP: 'DateTime',
	DATETIME: 'DateTime',
	DATE: 'Date',
	UUID: 'UUID',
	STRING: 'String',
	DEC: 'Decimal',
	DECIMAL: 'Decimal',
	NUMERIC: 'Decimal',
	FIXED: 'Decimal',
	JSON: 'JSON',
}

const INTEGER_BITS: Record<string, number> = {
	Int8: 8,
	Int16: 16,
	Int32: 32,
	Int64: 64,
	Int128: 128,
	Int256: 256,
	UInt8: 8,
	UInt16: 16,
	UInt32: 32,
	UInt64: 64,
	UInt128: 128,
	UInt256: 256,
}

export const isIntegerType = (type: DataType) => type.name in INTEGER_BITS
export const isFloatType = (type: DataType) =>
	type.name === 'Float32' || type.name === 'Float64' || type.name === 'BFloat16'
export const isNumberType = (type: DataType) => isIntegerType(type) || isFloatType(type) || type.name === 'Decimal'
export const integerBits = (type: DataType) => INTEGER_BITS[type.name] ?? 0
export const isUnsigned = (type: DataType) => type.name.startsWith('UInt')

export const unwrap = (type: DataType): DataType => {
	return type.name === 'Nullable' || type.name === 'LowCardinality' ? unwrap(type.inner) : type
}

export const isNullable = (type: DataType): boolean => {
	if (type.name === 'Nullable') return true
	if (type.name === 'LowCardinality') return isNullable(type.inner)

	return type.name === 'Nothing'
}

// ---------------------------------------------------------------
// parsing

class TypeReader {
	private pos = 0

	constructor(
		private readonly tokens: Token[],
		private readonly text: string
	) {}

	private peek() {
		return this.tokens[this.pos]!
	}

	private next() {
		return this.tokens[this.pos++]!
	}

	private isOp(value: string) {
		const token = this.peek()
		return token.kind === 'op' && token.value === value
	}

	private expectOp(value: string) {
		if (!this.isOp(value)) this.fail()
		this.pos++
	}

	fail(): never {
		throw unknownType(`Unknown data type family: ${this.text}`)
	}

	done() {
		return this.peek().kind === 'eof'
	}

	type(): DataType {
		const token = this.next()

		if (token.kind !== 'ident') this.fail()

		let name = token.value
		const alias = ALIASES[name.toUpperCase()]

		if (
			!SIMPLE.includes(name as SimpleType) &&
			![
				'Nullable',
				'LowCardinality',
				'Array',
				'Map',
				'Tuple',
				'Nested',
				'Enum8',
				'Enum16',
				'Enum',
				'DateTime',
				'DateTime64',
				'Decimal',
				'Decimal32',
				'Decimal64',
				'Decimal128',
				'Decimal256',
				'FixedString',
				'Object',
				'Variant',
			].includes(name)
		) {
			if (!alias) {
				throw unknownType(`Unknown data type family: ${name}`)
			}

			name = alias
		}

		// DOUBLE PRECISION, CHAR VARYING & friends.
		while (
			this.peek().kind === 'ident' &&
			['PRECISION', 'VARYING', 'UNSIGNED', 'SIGNED'].includes(
				(this.peek() as { value: string }).value.toUpperCase()
			)
		) {
			const word = (this.next() as { value: string }).value.toUpperCase()
			if (word === 'UNSIGNED' && name.startsWith('Int')) name = `U${name}`
		}

		const args = this.isOp('(') ? this.args() : []

		switch (name) {
			case 'Nullable':
			case 'LowCardinality':
			case 'Array':
				return { name, inner: this.single(args) }
			case 'Map': {
				const [key, value] = args
				if (!key || !value || key.kind !== 'type' || value.kind !== 'type') this.fail()
				return { name, key: key.type, value: value.type }
			}
			case 'Tuple':
			case 'Nested': {
				const items = args.map(arg => (arg.kind === 'type' ? arg.type : this.fail()))
				const names = args.map(arg => (arg.kind === 'type' ? arg.name : undefined))
				const tuple: DataType = { name: 'Tuple', items }

				if (names.every(name => name !== undefined)) {
					tuple.names = names as string[]
				}

				return name === 'Nested' ? { name: 'Array', inner: tuple } : tuple
			}
			case 'Enum':
			case 'Enum8':
			case 'Enum16': {
				let next = 1
				const values = args.map(arg => {
					if (arg.kind !== 'enum') this.fail()
					const value = arg.value ?? next
					next = value + 1
					return [arg.name, value] as [string, number]
				})

				const wide =
					name === 'Enum16' || (name === 'Enum' && values.some(([, value]) => value > 127 || value < -128))
				return { name: wide ? 'Enum16' : 'Enum8', values }
			}
			case 'DateTime': {
				const timeZone = args[0]?.kind === 'string' ? args[0].value : undefined
				if (timeZone && !isTimeZone(timeZone)) throw unknownType(`Invalid time zone: ${timeZone}`)
				return timeZone ? { name, timeZone } : { name }
			}
			case 'DateTime64': {
				const scale = args[0]?.kind === 'number' ? args[0].value : 3
				const timeZone = args[1]?.kind === 'string' ? args[1].value : undefined
				if (timeZone && !isTimeZone(timeZone)) throw unknownType(`Invalid time zone: ${timeZone}`)
				return timeZone ? { name, scale, timeZone } : { name, scale }
			}
			case 'Decimal': {
				const precision = args[0]?.kind === 'number' ? args[0].value : 10
				const scale = args[1]?.kind === 'number' ? args[1].value : 0
				return { name, precision, scale }
			}
			case 'Decimal32':
			case 'Decimal64':
			case 'Decimal128':
			case 'Decimal256': {
				const precision = { Decimal32: 9, Decimal64: 18, Decimal128: 38, Decimal256: 76 }[name]
				const scale = args[0]?.kind === 'number' ? args[0].value : 0
				return { name: 'Decimal', precision, scale }
			}
			case 'FixedString': {
				const length = args[0]?.kind === 'number' ? args[0].value : 1
				return { name, length }
			}
			case 'Object':
				return { name: 'JSON' }
			case 'Variant':
				return { name: 'Dynamic' }
			case 'JSON':
				return { name: 'JSON' }
			default:
				return { name: name as SimpleType }
		}
	}

	private single(args: Arg[]): DataType {
		const [arg] = args
		if (!arg || arg.kind !== 'type' || args.length !== 1) this.fail()
		return arg.type
	}

	private args(): Arg[] {
		this.expectOp('(')
		const args: Arg[] = []

		if (this.isOp(')')) {
			this.next()
			return args
		}

		do {
			args.push(this.arg())
		} while (this.isOp(',') && this.next())

		this.expectOp(')')

		return args
	}

	private arg(): Arg {
		const token = this.peek()

		if (token.kind === 'string') {
			this.next()

			if (this.isOp('=')) {
				this.next()
				const negative = this.isOp('-') && this.next()
				const number = this.next()
				if (number.kind !== 'number') this.fail()
				return { kind: 'enum', name: token.value, value: Number(number.value) * (negative ? -1 : 1) }
			}

			return { kind: 'string', value: token.value }
		}

		if (token.kind === 'number') {
			this.next()
			return { kind: 'number', value: Number(token.value) }
		}

		// A named tuple element, `name Type`, or a JSON type hint.
		if (token.kind === 'ident') {
			const following = this.tokens[this.pos + 1]

			if (following?.kind === 'ident') {
				this.next()
				return { kind: 'type', name: token.value, type: this.type() }
			}
		}

		return { kind: 'type', type: this.type() }
	}
}

type Arg =
	| { kind: 'type'; type: DataType; name?: string }
	| { kind: 'string'; value: string }
	| { kind: 'number'; value: number }
	| { kind: 'enum'; name: string; value?: number }

const typeCache = new Map<string, DataType>()

export const parseType = (text: string): DataType => {
	let type = typeCache.get(text)

	if (!type) {
		const reader = new TypeReader(tokenize(text), text)
		type = reader.type()

		if (!reader.done()) reader.fail()

		typeCache.set(text, type)
	}

	return type
}

// ---------------------------------------------------------------
// printing

const quote = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

export const formatType = (type: DataType): string => {
	switch (type.name) {
		case 'Nullable':
		case 'LowCardinality':
		case 'Array':
			return `${type.name}(${formatType(type.inner)})`
		case 'Map':
			return `Map(${formatType(type.key)}, ${formatType(type.value)})`
		case 'Tuple':
			return `Tuple(${type.items.map((item, index) => (type.names ? `${type.names[index]} ${formatType(item)}` : formatType(item))).join(', ')})`
		case 'Enum8':
		case 'Enum16':
			return `${type.name}(${type.values.map(([name, value]) => `${quote(name)} = ${value}`).join(', ')})`
		case 'DateTime':
			return type.timeZone ? `DateTime(${quote(type.timeZone)})` : 'DateTime'
		case 'DateTime64':
			return type.timeZone ? `DateTime64(${type.scale}, ${quote(type.timeZone)})` : `DateTime64(${type.scale})`
		case 'Decimal':
			return `Decimal(${type.precision}, ${type.scale})`
		case 'FixedString':
			return `FixedString(${type.length})`
		case 'Interval':
			return `Interval${type.unit}`
		default:
			return type.name
	}
}

// ---------------------------------------------------------------
// values

export const defaultValue = (type: DataType): Value => {
	switch (type.name) {
		case 'Nullable':
		case 'Nothing':
			return null
		case 'LowCardinality':
			return defaultValue(type.inner)
		case 'Array':
			return []
		case 'Map':
			return new Map()
		case 'Tuple':
			return new TupleValue(type.items.map(defaultValue), type.names)
		case 'Enum8':
		case 'Enum16':
			return type.values.find(([, value]) => value === 0)?.[0] ?? type.values[0]?.[0] ?? ''
		case 'DateTime':
			return new DateTimeValue(0, 0, type.timeZone)
		case 'DateTime64':
			return new DateTimeValue(0, type.scale, type.timeZone)
		case 'Date':
			return new DateValue(0)
		case 'Date32':
			return new DateValue(0, true)
		case 'String':
		case 'FixedString':
			return ''
		case 'UUID':
			return '00000000-0000-0000-0000-000000000000'
		case 'IPv4':
			return '0.0.0.0'
		case 'IPv6':
			return '::'
		case 'Bool':
			return false
		case 'JSON':
		case 'Dynamic':
			return {}
		default:
			return 0
	}
}

const zoneOffset = (zone: string) => {
	if (!/^[+-]/.test(zone)) return 0

	const sign = zone.startsWith('-') ? -1 : 1
	const digits = zone.slice(1).replace(':', '')

	return sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || 0)) * 60_000
}

const DATE_TIME =
	/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?\s*(Z|UTC|GMT|[+-]\d{2}(?::?\d{2})?)?$/i

// Reads a date & time the way the best_effort input format does: ISO 8601
// with or without a zone, a plain date, or a unix timestamp.
export const parseDateTime = (text: string, timeZone = 'UTC'): number => {
	const trimmed = text.trim()

	if (/^\d{9,10}(\.\d+)?$/.test(trimmed)) {
		return Number(trimmed) * 1000
	}

	if (/^\d{12,13}$/.test(trimmed)) {
		return Number(trimmed)
	}

	const match = DATE_TIME.exec(trimmed)

	if (match) {
		const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = '', zone] = match
		const millis = fraction ? Number(`0.${fraction}`) * 1000 : 0

		if (zone) {
			return (
				Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) -
				zoneOffset(zone) +
				millis
			)
		}

		return (
			fromParts(
				Number(year),
				Number(month),
				Number(day),
				Number(hour),
				Number(minute),
				Number(second),
				timeZone
			) + millis
		)
	}

	const parsed = Date.parse(trimmed)

	if (!Number.isNaN(parsed)) {
		return parsed
	}

	throw cannotParseDateTime(`Cannot read DateTime: unexpected value "${text}"`)
}

export const parseDate = (text: string): number => {
	const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text.trim())

	if (!match) {
		if (/^\d+$/.test(text.trim())) return Number(text.trim())
		throw cannotParseText(`Cannot parse date: value "${text}" is not a date`)
	}

	return partsToDay(Number(match[1]), Number(match[2]), Number(match[3]))
}

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

const toUuid = (text: string) => {
	if (!UUID.test(text)) {
		throw cannotParseUuid(`Cannot parse uuid ${text}`)
	}

	const hex = text.replaceAll('-', '').toLowerCase()

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const parseInteger = (text: string, type: DataType): number | bigint => {
	const trimmed = text.trim()

	if (!/^[+-]?\d+(\.\d*)?([eE][+-]?\d+)?$/.test(trimmed)) {
		throw cannotParseNumber(`Cannot parse ${formatType(type)} from String "${text}"`)
	}

	if (/^[+-]?\d+$/.test(trimmed)) {
		return wrapInteger(BigInt(trimmed), type)
	}

	return wrapInteger(BigInt(Math.trunc(Number(trimmed))), type)
}

// Integers wrap around their width like they do in ClickHouse.
export const wrapInteger = (value: bigint | number, type: DataType): number | bigint => {
	const bits = integerBits(type)

	if (!bits) {
		return typeof value === 'bigint' ? normalizeNumber(value) : value
	}

	const big = typeof value === 'bigint' ? value : BigInt(Math.trunc(value))
	const wrapped = isUnsigned(type) ? BigInt.asUintN(bits, big) : BigInt.asIntN(bits, big)

	return normalizeNumber(wrapped)
}

const toBool = (value: Value): boolean => {
	if (typeof value === 'boolean') return value
	if (isNumeric(value)) return Number(value) !== 0

	if (typeof value === 'string') {
		const lower = value.trim().toLowerCase()
		if (['true', '1', 'yes', 'on', 't', 'y', 'enable', 'enabled'].includes(lower)) return true
		if (['false', '0', 'no', 'off', 'f', 'n', 'disable', 'disabled'].includes(lower)) return false
	}

	throw cannotParseText(`Cannot parse boolean value here: '${String(value)}'`)
}

// Milliseconds cut to a DateTime64's scale: the digits past it are dropped,
// like ClickHouse drops them when it reads a value.
export const quantize = (ms: number, scale: number) => {
	if (scale >= 3) {
		const factor = 10 ** (scale - 3)
		return Math.floor(ms * factor) / factor
	}

	const unit = 10 ** (3 - scale)
	return Math.floor(ms / unit) * unit
}

// Converts a value the engine holds into a type, like CAST does.
export const castValue = (value: Value, type: DataType, nullable = false): Value => {
	if (value === null) {
		if (isNullable(type) || nullable) return null
		throw cannotParseText(`Cannot convert NULL value to non-Nullable type ${formatType(type)}`)
	}

	switch (type.name) {
		case 'Nullable':
			return castValue(value, type.inner, true)
		case 'LowCardinality':
			return castValue(value, type.inner, nullable)
		case 'String':
		case 'FixedString':
			return stringOf(value)
		case 'UUID':
			return toUuid(stringOf(value))
		case 'IPv4':
		case 'IPv6':
			return stringOf(value)
		case 'Bool':
			return toBool(value)
		case 'Date':
		case 'Date32':
			if (value instanceof DateValue) return new DateValue(value.days, type.name === 'Date32')
			if (value instanceof DateTimeValue)
				return new DateValue(dayNumberIn(value.ms, value.timeZone ?? 'UTC'), type.name === 'Date32')
			if (typeof value === 'string') return new DateValue(parseDate(value), type.name === 'Date32')
			return new DateValue(Math.trunc(toNumber(value)), type.name === 'Date32')
		case 'DateTime':
		case 'DateTime64': {
			const scale = type.name === 'DateTime64' ? type.scale : 0
			let ms: number

			if (value instanceof DateTimeValue) ms = value.ms
			else if (value instanceof DateValue)
				ms = fromParts(1970, 1, 1 + value.days, 0, 0, 0, type.timeZone ?? 'UTC')
			else if (typeof value === 'string') ms = parseDateTime(value, type.timeZone)
			else ms = toNumber(value) * 1000

			return new DateTimeValue(quantize(ms, scale), scale, type.timeZone)
		}
		case 'Array':
			if (!Array.isArray(value)) {
				if (typeof value === 'string') return castValue(parseLiteralText(value), type)
				throw cannotParseText(`Cannot convert ${stringOf(value)} to ${formatType(type)}`)
			}

			return value.map(item => castValue(item, type.inner))
		case 'Tuple': {
			const items = value instanceof TupleValue ? value.items : Array.isArray(value) ? value : null
			if (!items) throw cannotParseText(`Cannot convert ${stringOf(value)} to ${formatType(type)}`)
			return new TupleValue(
				type.items.map((item, index) => castValue(items[index] ?? null, item)),
				type.names
			)
		}
		case 'Map': {
			const entries =
				value instanceof Map
					? [...value.entries()]
					: typeof value === 'object'
						? Object.entries(value as object)
						: null
			if (!entries) throw cannotParseText(`Cannot convert ${stringOf(value)} to ${formatType(type)}`)
			return new Map(
				entries.map(([key, item]) => [castValue(key as Value, type.key), castValue(item as Value, type.value)])
			)
		}
		case 'Enum8':
		case 'Enum16': {
			if (isNumeric(value)) {
				const found = type.values.find(([, number]) => number === Number(value))
				if (!found) throw unknownElementOfEnum(`Unexpected value ${value} in enum`)
				return found[0]
			}

			const name = stringOf(value)
			if (!type.values.some(([member]) => member === name)) {
				throw unknownElementOfEnum(`Unknown element '${name}' for enum`)
			}

			return name
		}
		case 'JSON':
		case 'Dynamic':
			if (typeof value === 'string') {
				try {
					return JSON.parse(value)
				} catch {
					throw cannotParseText(`Cannot parse JSON object here: ${value}`)
				}
			}

			return value
		case 'Float32':
		case 'Float64':
		case 'BFloat16':
		case 'Decimal': {
			if (typeof value === 'string') {
				const trimmed = value.trim().toLowerCase()
				if (trimmed === 'inf' || trimmed === '+inf') return Infinity
				if (trimmed === '-inf') return -Infinity
				if (trimmed === 'nan') return NaN
				const number = Number(trimmed)
				if (trimmed === '' || Number.isNaN(number))
					throw cannotParseNumber(`Cannot parse ${formatType(type)} from String "${value}"`)
				return type.name === 'Float32' ? Math.fround(number) : number
			}

			const number = toNumber(value)
			return type.name === 'Float32' ? Math.fround(number) : number
		}
		case 'Interval':
			return toNumber(value)
		case 'Nothing':
			return null
		default:
			if (isIntegerType(type)) {
				if (typeof value === 'string') return parseInteger(value, type)
				if (typeof value === 'bigint') return wrapInteger(value, type)
				if (value instanceof DateTimeValue) return wrapInteger(Math.floor(value.ms / 1000), type)
				return wrapInteger(Math.trunc(toNumber(value)), type)
			}

			return value
	}
}

// The text form of a value, like toString.
export const stringOf = (value: Value): string => {
	if (typeof value === 'string') return value
	if (value === null) return 'NULL'
	if (typeof value === 'boolean') return value ? 'true' : 'false'
	if (typeof value === 'number') return formatNumber(value)
	if (typeof value === 'bigint') return value.toString()
	if (value instanceof DateTimeValue || value instanceof DateValue) return textValue(value)
	if (Array.isArray(value) || value instanceof TupleValue || value instanceof Map) return textValue(value)

	return JSON.stringify(value)
}

export const formatNumber = (value: number) => {
	if (Number.isNaN(value)) return 'nan'
	if (value === Infinity) return 'inf'
	if (value === -Infinity) return '-inf'
	if (Object.is(value, -0)) return '-0'

	return String(value)
}

// Values in ClickHouse's text format, the way TabSeparated & toString
// write them: dates in their zone, strings quoted inside arrays.
export const textValue = (value: Value, nested = false): string => {
	if (value === null) return nested ? 'NULL' : '\\N'
	if (typeof value === 'string') return nested ? quote(value) : value
	if (typeof value === 'number') return formatNumber(value)
	if (typeof value === 'bigint') return value.toString()
	if (typeof value === 'boolean') return value ? 'true' : 'false'

	if (value instanceof DateTimeValue) {
		const text = formatDateTimeValue(value)
		return nested ? quote(text) : text
	}

	if (value instanceof DateValue) {
		const text = formatDateValue(value)
		return nested ? quote(text) : text
	}

	if (Array.isArray(value)) return `[${value.map(item => textValue(item, true)).join(',')}]`
	if (value instanceof TupleValue) return `(${value.items.map(item => textValue(item, true)).join(',')})`
	if (value instanceof Map)
		return `{${[...value.entries()].map(([key, item]) => `${textValue(key, true)}:${textValue(item, true)}`).join(',')}}`

	return JSON.stringify(value)
}

export const formatDateTimeValue = (value: DateTimeValue, serverTimeZone = 'UTC') => {
	return formatLocal(value.ms, value.timeZone ?? serverTimeZone, value.scale)
}

export const formatDateValue = (value: DateValue) => formatDay(value.days)

// Parses ClickHouse's literal text, ['a','b'] or (1,'x') or {'k':1}, for
// query parameters & casts from strings.
export const parseLiteralText = (text: string): Value => {
	const tokens = tokenize(text)
	let pos = 0

	const fail = (): never => {
		throw badQueryParameter(`Value ${text} cannot be parsed as a literal`)
	}

	const peek = () => tokens[pos]!
	const isOp = (value: string) => {
		const token = peek()
		return token.kind === 'op' && token.value === value
	}

	const read = (): Value => {
		const token = tokens[pos++]!

		if (token.kind === 'string') return token.value
		if (token.kind === 'number')
			return /[.eE]/.test(token.value) ? Number(token.value) : normalizeNumber(BigInt(token.value))
		if (token.kind === 'op' && token.value === '-') {
			const number = read()
			return typeof number === 'bigint' ? -number : -(number as number)
		}

		if (token.kind === 'ident') {
			const upper = token.value.toUpperCase()
			if (upper === 'NULL') return null
			if (upper === 'TRUE') return true
			if (upper === 'FALSE') return false
			if (upper === 'INF') return Infinity
			if (upper === 'NAN') return NaN
			fail()
		}

		if (token.kind === 'op' && (token.value === '[' || token.value === '(' || token.value === '{')) {
			const close = token.value === '[' ? ']' : token.value === '(' ? ')' : '}'
			const items: Value[] = []
			const entries: [Value, Value][] = []

			if (isOp(close)) {
				pos++
				return close === ']' ? items : close === ')' ? new TupleValue(items) : new Map()
			}

			do {
				const item = read()

				if (close === '}') {
					if (!isOp(':')) fail()
					pos++
					entries.push([item, read()])
				} else {
					items.push(item)
				}
			} while (isOp(',') && pos++)

			if (!isOp(close)) fail()
			pos++

			return close === ']' ? items : close === ')' ? new TupleValue(items) : new Map(entries)
		}

		return fail()
	}

	const value = read()

	if (peek().kind !== 'eof') fail()

	return value
}

// A query parameter's text in its declared type.
export const parseParam = (text: string, type: DataType): Value => {
	if (text === '\\N' && isNullable(type)) return null

	const base = unwrap(type)

	switch (base.name) {
		case 'String':
		case 'FixedString':
			return unescape(text)
		case 'Array':
		case 'Tuple':
		case 'Map':
			return castValue(parseLiteralText(text), base)
		case 'DateTime':
		case 'DateTime64':
		case 'Date':
		case 'Date32':
		case 'Enum8':
		case 'Enum16':
		case 'UUID':
		case 'Bool':
			return castValue(unescape(text), base)
		default:
			return castValue(text, base)
	}
}

// The escaped text format: backslash sequences stand for their character.
export const unescape = (text: string) => {
	return text.replace(/\\(x[0-9a-fA-F]{2}|.)/g, (_, char: string) => {
		if (char.length === 3) return String.fromCharCode(parseInt(char.slice(1), 16))
		return { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '0': '\0', a: '\x07', v: '\v', e: '\x1b' }[char] ?? char
	})
}

// A JSONEachRow value into the column's type.
export const fromJson = (value: unknown, type: DataType): Value => {
	if (value === null || value === undefined) {
		return isNullable(type) ? null : defaultValue(type)
	}

	const base = type.name === 'Nullable' || type.name === 'LowCardinality' ? unwrap(type) : type

	switch (base.name) {
		case 'Array':
			if (!Array.isArray(value))
				throw cannotParseText(`Cannot parse input: expected '[' before: ${JSON.stringify(value)}`)
			return value.map(item => fromJson(item, base.inner))
		case 'Tuple': {
			const items = Array.isArray(value)
				? value
				: base.names
					? base.names.map(name => (value as Record<string, unknown>)[name])
					: null
			if (!items) throw cannotParseText(`Cannot parse tuple from ${JSON.stringify(value)}`)
			return new TupleValue(
				base.items.map((item, index) => fromJson(items[index], item)),
				base.names
			)
		}
		case 'Map':
			if (typeof value !== 'object' || Array.isArray(value))
				throw cannotParseText(`Cannot parse map from ${JSON.stringify(value)}`)
			return new Map(
				Object.entries(value as object).map(([key, item]) => [
					castValue(key, base.key),
					fromJson(item, base.value),
				])
			)
		case 'JSON':
		case 'Dynamic':
			return typeof value === 'string' ? castValue(value, base) : (structuredClone(value as object) as Value)
		case 'String':
		case 'FixedString':
			return typeof value === 'object' ? JSON.stringify(value) : String(value)
		default:
			if (typeof value === 'object') {
				throw cannotParseText(`Cannot parse ${formatType(base)} from ${JSON.stringify(value)}`)
			}

			return castValue(value as Value, base)
	}
}
