import { notFloat, notInteger, RedisError } from './errors'

const INT_RE = /^(?:0|-?[1-9]\d*)$/
const FLOAT_RE = /^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)$/
const INF_RE = /^[+-]?inf(?:inity)?$/i

export const INT64_MAX = 9223372036854775807n
export const INT64_MIN = -9223372036854775808n

export const parseInt64 = (value: string): bigint => {
	if (!INT_RE.test(value)) {
		throw notInteger()
	}

	const n = BigInt(value)

	if (n > INT64_MAX || n < INT64_MIN) {
		throw notInteger()
	}

	return n
}

// For counts, offsets and indexes, where redis parses a long long but the
// values we handle always fit a JS number.
export const parseInteger = (value: string, error: () => RedisError = notInteger): number => {
	if (!INT_RE.test(value)) {
		throw error()
	}

	const n = Number(value)

	if (!Number.isSafeInteger(n)) {
		throw error()
	}

	return n
}

export const parseFloatArg = (value: string, error: () => RedisError = notFloat): number => {
	if (INF_RE.test(value)) {
		return value.startsWith('-') ? -Infinity : Infinity
	}

	if (!FLOAT_RE.test(value)) {
		throw error()
	}

	const n = Number(value)

	if (Number.isNaN(n)) {
		throw error()
	}

	return n
}

// Shortest round-trip representation, the way redis 7 prints doubles.
export const formatDouble = (value: number): string => {
	if (value === Infinity) {
		return 'inf'
	}

	if (value === -Infinity) {
		return '-inf'
	}

	if (Number.isNaN(value)) {
		return 'nan'
	}

	return String(value)
}

// Mimics C's %.<precision>g: significant digits, no trailing zeros.
export const formatG = (value: number, precision: number): string => {
	if (!Number.isFinite(value)) {
		return formatDouble(value)
	}

	let text = value.toPrecision(precision)
	let exponent = ''
	const e = text.indexOf('e')

	if (e !== -1) {
		exponent = text.slice(e)
		text = text.slice(0, e)
	}

	if (text.includes('.')) {
		text = text.replace(/0+$/, '').replace(/\.$/, '')
	}

	return text + exponent
}

// INCRBYFLOAT uses long doubles printed with %.17Lg, so the double rounding
// noise a JS addition leaves behind must be trimmed off.
export const formatLongDouble = (value: number) => formatG(value, 16)
