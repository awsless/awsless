// How values live in the engine: strings, numbers (bigint for 64-bit
// integers past what a double holds), booleans, null, arrays, & these
// classes for the types JavaScript has no value for.

export class DateTimeValue {
	constructor(
		// Milliseconds since the epoch, with a fraction for DateTime64(6+).
		readonly ms: number,
		// Digits after the second: 0 for DateTime, the precision of a DateTime64.
		readonly scale: number,
		// The zone it's shown in; the server's zone when unset.
		readonly timeZone?: string
	) {}
}

export class DateValue {
	constructor(
		// Days since 1970-01-01.
		readonly days: number,
		readonly wide = false
	) {}
}

export class TupleValue {
	constructor(
		readonly items: Value[],
		readonly names?: string[]
	) {}
}

export class IntervalValue {
	constructor(
		readonly unit: IntervalUnit,
		readonly count: number
	) {}
}

export type IntervalUnit =
	| 'Nanosecond'
	| 'Microsecond'
	| 'Millisecond'
	| 'Second'
	| 'Minute'
	| 'Hour'
	| 'Day'
	| 'Week'
	| 'Month'
	| 'Quarter'
	| 'Year'

export type Value =
	| string
	| number
	| bigint
	| boolean
	| null
	| Value[]
	| DateTimeValue
	| DateValue
	| TupleValue
	| IntervalValue
	| Map<Value, Value>
	| { [key: string]: unknown }

export const isNumeric = (value: Value): value is number | bigint => {
	return typeof value === 'number' || typeof value === 'bigint'
}

export const toNumber = (value: Value): number => {
	if (typeof value === 'number') return value
	if (typeof value === 'bigint') return Number(value)
	if (typeof value === 'boolean') return value ? 1 : 0
	if (value instanceof DateTimeValue) return Math.floor(value.ms / 1000)
	if (value instanceof DateValue) return value.days

	return Number(value)
}

// Bigints stay bigints while they hold whole numbers, numbers once a side
// is fractional.
export const normalizeNumber = (value: number | bigint): number | bigint => {
	if (
		typeof value === 'bigint' &&
		value >= BigInt(Number.MIN_SAFE_INTEGER) &&
		value <= BigInt(Number.MAX_SAFE_INTEGER)
	) {
		return Number(value)
	}

	return value
}

// UTF-8 byte order, like ClickHouse compares strings. UTF-16 code units
// sort the same way below the surrogates, so only those need the bytes.
const compareStrings = (a: string, b: string) => {
	const length = Math.min(a.length, b.length)

	for (let i = 0; i < length; i++) {
		const x = a.charCodeAt(i)
		const y = b.charCodeAt(i)

		if (x === y) continue
		if (x >= 0xd800 || y >= 0xd800) return Buffer.compare(Buffer.from(a.slice(i)), Buffer.from(b.slice(i)))

		return x - y
	}

	return a.length - b.length
}

const rank = (value: Value) => {
	if (value === null) return 0
	if (typeof value === 'boolean' || isNumeric(value)) return 1
	if (value instanceof DateTimeValue) return 2
	if (value instanceof DateValue) return 3
	if (typeof value === 'string') return 4
	if (Array.isArray(value)) return 5
	if (value instanceof TupleValue) return 6

	return 7
}

// The order ORDER BY & min/max use. Strings compare as bytes, like
// ClickHouse does.
export const compareValues = (a: Value, b: Value): number => {
	if (a === b) return 0

	if ((isNumeric(a) || typeof a === 'boolean') && (isNumeric(b) || typeof b === 'boolean')) {
		const x = typeof a === 'boolean' ? Number(a) : a
		const y = typeof b === 'boolean' ? Number(b) : b

		if (typeof x === 'number' && Number.isNaN(x)) return typeof y === 'number' && Number.isNaN(y) ? 0 : 1
		if (typeof y === 'number' && Number.isNaN(y)) return -1

		return x < y ? -1 : x > y ? 1 : 0
	}

	if (a instanceof DateTimeValue && b instanceof DateTimeValue) return a.ms - b.ms
	if (a instanceof DateValue && b instanceof DateValue) return a.days - b.days
	if (a instanceof DateTimeValue && b instanceof DateValue) return a.ms - b.days * 86_400_000
	if (a instanceof DateValue && b instanceof DateTimeValue) return a.days * 86_400_000 - b.ms

	if (typeof a === 'string' && typeof b === 'string') {
		return compareStrings(a, b)
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		for (let i = 0; i < Math.min(a.length, b.length); i++) {
			const result = compareValues(a[i]!, b[i]!)
			if (result !== 0) return result
		}

		return a.length - b.length
	}

	if (a instanceof TupleValue && b instanceof TupleValue) {
		return compareValues(a.items, b.items)
	}

	return rank(a) - rank(b)
}

// A key that's equal for equal values, for grouping & distinct.
export const valueKey = (value: Value): string => {
	if (value === null) return 'n'
	// Length first, so a key built from several values can't be read two ways.
	if (typeof value === 'string') return `s${value.length}:${value}`
	if (typeof value === 'number') return `d${value}`
	if (typeof value === 'bigint') return `d${normalizeNumber(value)}`
	if (typeof value === 'boolean') return `d${Number(value)}`
	if (value instanceof DateTimeValue) return `t${value.ms}`
	if (value instanceof DateValue) return `D${value.days}`
	if (Array.isArray(value)) return `[${value.map(valueKey).join(',')}]`
	if (value instanceof TupleValue) return `(${value.items.map(valueKey).join(',')})`
	if (value instanceof IntervalValue) return `i${value.unit}${value.count}`
	if (value instanceof Map)
		return `{${[...value.entries()].map(([k, v]) => `${valueKey(k)}:${valueKey(v)}`).join(',')}}`

	return `j${JSON.stringify(value)}`
}

export const valuesEqual = (a: Value, b: Value) => valueKey(a) === valueKey(b)
