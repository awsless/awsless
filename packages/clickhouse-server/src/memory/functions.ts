import { createHash, randomUUID } from 'crypto'
import { argumentCount, badArguments, cannotParseText, illegalDivision, illegalType, incorrectData } from './errors'
import { dayNumberIn, dayToParts, fromParts, isTimeZone, partsIn, partsToDay } from './time'
import {
	castValue,
	DataType,
	defaultValue,
	formatDateTimeValue,
	formatDateValue,
	parseDateTime,
	parseType,
	quantize,
	stringOf,
	textValue,
	wrapInteger,
} from './types'
import {
	compareValues,
	DateTimeValue,
	DateValue,
	IntervalUnit,
	IntervalValue,
	isNumeric,
	normalizeNumber,
	toNumber,
	TupleValue,
	Value,
	valueKey,
	valuesEqual,
} from './values'

export type FunctionContext = {
	now: number
	serverTimeZone: string
	settings: Record<string, unknown>
	database: string
}

export type ScalarFunction = {
	call: (args: Value[], ctx: FunctionContext) => Value
	// Most functions answer NULL when an argument is NULL; these look at
	// the NULL themselves.
	handlesNull?: boolean
	min?: number
	max?: number
}

const functions = new Map<string, ScalarFunction>()
const caseInsensitive = new Map<string, string>()

const define = (names: string | string[], fn: ScalarFunction, insensitive = false) => {
	for (const name of Array.isArray(names) ? names : [names]) {
		functions.set(name, fn)
		if (insensitive) caseInsensitive.set(name.toLowerCase(), name)
	}
}

export const findFunction = (name: string) => {
	return functions.get(name) ?? functions.get(caseInsensitive.get(name.toLowerCase()) ?? '')
}

export const functionNames = () => [...functions.keys()]

// ---------------------------------------------------------------
// helpers

const tzArg = (value: Value | undefined, fallback?: string) => {
	if (value === undefined) return fallback

	const zone = stringOf(value)

	if (!isTimeZone(zone)) {
		throw badArguments(`Invalid time zone: ${zone}`)
	}

	return zone
}

const zoneOf = (value: Value, ctx: FunctionContext, override?: Value) => {
	return tzArg(
		override,
		value instanceof DateTimeValue ? (value.timeZone ?? ctx.serverTimeZone) : ctx.serverTimeZone
	)!
}

// A DateTime, Date or date string as milliseconds.
const msOf = (value: Value, timeZone: string): number => {
	if (value instanceof DateTimeValue) return value.ms
	if (value instanceof DateValue) return fromParts(1970, 1, 1 + value.days, 0, 0, 0, timeZone)
	if (typeof value === 'string') return parseDateTime(value, timeZone)
	if (isNumeric(value)) return toNumber(value) * 1000

	throw illegalType(`Illegal type of argument: expected a date or date time, got ${stringOf(value)}`)
}

const integer = (value: Value) => Math.trunc(toNumber(value))

const asArray = (value: Value, name: string): Value[] => {
	if (Array.isArray(value)) return value
	throw illegalType(`Argument for function ${name} must be an array`)
}

const asString = (value: Value, name: string): string => {
	if (typeof value === 'string') return value
	throw illegalType(`Illegal type of argument of function ${name}, expected String`)
}

const bool = (value: Value) => (value ? 1 : 0)

const truthy = (value: Value): boolean => {
	if (value === null) return false
	if (typeof value === 'boolean') return value
	if (isNumeric(value)) return Number(value) !== 0
	if (typeof value === 'string') return value !== '' && value !== '0'

	return true
}

export { truthy }

// Two numbers with integer semantics when both are whole, bigint when
// they don't fit a double.
const arithmetic = (
	a: Value,
	b: Value,
	op: (x: number, y: number) => number,
	big: (x: bigint, y: bigint) => bigint
) => {
	const x = typeof a === 'boolean' ? Number(a) : a
	const y = typeof b === 'boolean' ? Number(b) : b

	if (!isNumeric(x) || !isNumeric(y)) {
		throw illegalType(`Illegal types ${stringOf(a)} and ${stringOf(b)} of arguments of function`)
	}

	if (typeof x === 'bigint' || typeof y === 'bigint') {
		if ((typeof x === 'bigint' || Number.isInteger(x)) && (typeof y === 'bigint' || Number.isInteger(y))) {
			return normalizeNumber(big(BigInt(x), BigInt(y)))
		}

		return op(Number(x), Number(y))
	}

	const result = op(x, y)

	if (Number.isInteger(x) && Number.isInteger(y) && !Number.isSafeInteger(result) && Number.isFinite(result)) {
		return normalizeNumber(big(BigInt(x), BigInt(y)))
	}

	return result
}

// ---------------------------------------------------------------
// dates & intervals

const addMonths = (ms: number, months: number, timeZone: string) => {
	const p = partsIn(ms, timeZone)
	const total = p.year * 12 + (p.month - 1) + months
	const year = Math.floor(total / 12)
	const month = (total % 12) + 1
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
	const subsecond = ms - Math.floor(ms / 1000) * 1000

	return fromParts(year, month, Math.min(p.day, lastDay), p.hour, p.minute, p.second, timeZone) + subsecond
}

const UNIT_MS: Partial<Record<IntervalUnit, number>> = {
	Nanosecond: 1e-6,
	Microsecond: 1e-3,
	Millisecond: 1,
	Second: 1000,
	Minute: 60_000,
	Hour: 3_600_000,
}

export const addInterval = (value: Value, interval: IntervalValue, sign: number, ctx: FunctionContext): Value => {
	const count = interval.count * sign

	if (value instanceof DateValue) {
		switch (interval.unit) {
			case 'Day':
				return new DateValue(value.days + count, value.wide)
			case 'Week':
				return new DateValue(value.days + count * 7, value.wide)
			case 'Month':
			case 'Quarter':
			case 'Year': {
				const months = count * (interval.unit === 'Month' ? 1 : interval.unit === 'Quarter' ? 3 : 12)
				return new DateValue(dayNumberIn(addMonths(value.days * 86_400_000, months, 'UTC'), 'UTC'), value.wide)
			}
			default: {
				// A Date plus hours becomes a DateTime.
				const ms = fromParts(1970, 1, 1 + value.days, 0, 0, 0, ctx.serverTimeZone)
				return new DateTimeValue(ms + count * UNIT_MS[interval.unit]!, 0)
			}
		}
	}

	if (value instanceof DateTimeValue) {
		const timeZone = value.timeZone ?? ctx.serverTimeZone
		const scale = Math.max(
			value.scale,
			interval.unit === 'Millisecond'
				? 3
				: interval.unit === 'Microsecond'
					? 6
					: interval.unit === 'Nanosecond'
						? 9
						: 0
		)

		switch (interval.unit) {
			case 'Day':
			case 'Week': {
				const days = count * (interval.unit === 'Week' ? 7 : 1)
				const p = partsIn(value.ms, timeZone)
				const subsecond = value.ms - Math.floor(value.ms / 1000) * 1000
				return new DateTimeValue(
					fromParts(p.year, p.month, p.day + days, p.hour, p.minute, p.second, timeZone) + subsecond,
					value.scale,
					value.timeZone
				)
			}
			case 'Month':
			case 'Quarter':
			case 'Year': {
				const months = count * (interval.unit === 'Month' ? 1 : interval.unit === 'Quarter' ? 3 : 12)
				return new DateTimeValue(addMonths(value.ms, months, timeZone), value.scale, value.timeZone)
			}
			default:
				return new DateTimeValue(value.ms + count * UNIT_MS[interval.unit]!, scale, value.timeZone)
		}
	}

	if (typeof value === 'string') {
		return addInterval(new DateTimeValue(parseDateTime(value, ctx.serverTimeZone), 0), interval, sign, ctx)
	}

	throw illegalType(`Illegal types of arguments for adding an interval to ${stringOf(value)}`)
}

const startOf = (
	value: Value,
	ctx: FunctionContext,
	unit: 'year' | 'quarter' | 'month' | 'week' | 'day',
	override?: Value,
	mode = 0
): Value => {
	const timeZone = zoneOf(value, ctx, override)
	const ms = msOf(value, timeZone)
	const p =
		value instanceof DateValue
			? { ...dayToParts(value.days), hour: 0, minute: 0, second: 0 }
			: partsIn(ms, timeZone)

	switch (unit) {
		case 'year':
			return new DateValue(partsToDay(p.year, 1, 1))
		case 'quarter':
			return new DateValue(partsToDay(p.year, Math.floor((p.month - 1) / 3) * 3 + 1, 1))
		case 'month':
			return new DateValue(partsToDay(p.year, p.month, 1))
		case 'week': {
			const day = partsToDay(p.year, p.month, p.day)
			// Mode 0 weeks start on Sunday, mode 1 (& toMonday) on Monday.
			const offset = mode % 2 === 1 ? p.weekday - 1 : p.weekday % 7
			return new DateValue(day - offset)
		}
		case 'day':
			return new DateTimeValue(
				fromParts(p.year, p.month, p.day, 0, 0, 0, timeZone),
				0,
				value instanceof DateTimeValue || override !== undefined ? timeZone : undefined
			)
	}
}

const startOfTime = (value: Value, ctx: FunctionContext, seconds: number, override?: Value) => {
	const timeZone = zoneOf(value, ctx, override)
	const ms = msOf(value, timeZone)
	const offset = offsetMs(ms, timeZone)
	const local = ms + offset
	const floored = Math.floor(local / (seconds * 1000)) * seconds * 1000

	return new DateTimeValue(
		floored - offsetMs(floored - offset, timeZone),
		0,
		value instanceof DateTimeValue || override !== undefined ? timeZone : undefined
	)
}

const offsetMs = (ms: number, timeZone: string) => {
	const p = partsIn(ms, timeZone)
	const whole = Math.floor(ms / 1000) * 1000
	return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole
}

const datePart = (value: Value, ctx: FunctionContext, override?: Value) => {
	if (value instanceof DateValue && override === undefined) {
		return { ...dayToParts(value.days), hour: 0, minute: 0, second: 0 }
	}

	const timeZone = zoneOf(value, ctx, override)
	return partsIn(msOf(value, timeZone), timeZone)
}

const toInterval = (unit: IntervalUnit) => ({
	call: ([count]: Value[]) => new IntervalValue(unit, toNumber(count!)),
	min: 1,
	max: 1,
})

const UNIT_ALIASES: Record<string, IntervalUnit> = {
	nanosecond: 'Nanosecond',
	ns: 'Nanosecond',
	microsecond: 'Microsecond',
	us: 'Microsecond',
	millisecond: 'Millisecond',
	ms: 'Millisecond',
	second: 'Second',
	ss: 'Second',
	s: 'Second',
	minute: 'Minute',
	mi: 'Minute',
	n: 'Minute',
	hour: 'Hour',
	hh: 'Hour',
	h: 'Hour',
	day: 'Day',
	dd: 'Day',
	d: 'Day',
	week: 'Week',
	wk: 'Week',
	ww: 'Week',
	month: 'Month',
	mm: 'Month',
	m: 'Month',
	quarter: 'Quarter',
	qq: 'Quarter',
	q: 'Quarter',
	year: 'Year',
	yyyy: 'Year',
	yy: 'Year',
}

const unitOf = (value: Value): IntervalUnit => {
	const text = stringOf(value).toLowerCase().replace(/s$/, '')
	const unit = UNIT_ALIASES[text] ?? UNIT_ALIASES[stringOf(value).toLowerCase()]

	if (!unit) throw badArguments(`Invalid unit '${stringOf(value)}'`)

	return unit
}

const dateDiff = (unit: IntervalUnit, a: Value, b: Value, ctx: FunctionContext, override?: Value) => {
	const timeZone = tzArg(
		override,
		a instanceof DateTimeValue ? (a.timeZone ?? ctx.serverTimeZone) : ctx.serverTimeZone
	)!
	const x = msOf(a, timeZone)
	const y = msOf(b, timeZone)

	// Calendar units count the boundaries crossed, like ClickHouse.
	switch (unit) {
		case 'Year':
		case 'Quarter':
		case 'Month': {
			const p = partsIn(x, timeZone)
			const q = partsIn(y, timeZone)
			const months = (q.year - p.year) * 12 + (q.month - p.month)
			return unit === 'Month'
				? months
				: unit === 'Quarter'
					? Math.floor((q.year * 12 + q.month - 1) / 3) - Math.floor((p.year * 12 + p.month - 1) / 3)
					: q.year - p.year
		}
		case 'Week':
			return Math.floor((dayNumberIn(y, timeZone) + 3) / 7) - Math.floor((dayNumberIn(x, timeZone) + 3) / 7)
		case 'Day':
			return dayNumberIn(y, timeZone) - dayNumberIn(x, timeZone)
		case 'Hour':
			return Math.floor(y / 3_600_000) - Math.floor(x / 3_600_000)
		case 'Minute':
			return Math.floor(y / 60_000) - Math.floor(x / 60_000)
		case 'Second':
			return Math.floor(y / 1000) - Math.floor(x / 1000)
		case 'Millisecond':
			return Math.floor(y) - Math.floor(x)
		default:
			return Math.round((y - x) * 1000)
	}
}

const FORMAT_CODES: Record<string, (p: ReturnType<typeof partsIn>, ms: number) => string> = {
	Y: p => String(p.year).padStart(4, '0'),
	y: p => String(p.year % 100).padStart(2, '0'),
	C: p => String(Math.floor(p.year / 100)).padStart(2, '0'),
	m: p => String(p.month).padStart(2, '0'),
	d: p => String(p.day).padStart(2, '0'),
	e: p => String(p.day).padStart(2, ' '),
	H: p => String(p.hour).padStart(2, '0'),
	k: p => String(p.hour).padStart(2, ' '),
	I: p => String(((p.hour + 11) % 12) + 1).padStart(2, '0'),
	l: p => String(((p.hour + 11) % 12) + 1).padStart(2, '0'),
	i: p => String(p.minute).padStart(2, '0'),
	M: p =>
		[
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		][p.month - 1]!,
	b: p => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.month - 1]!,
	h: p => FORMAT_CODES.I!(p, 0),
	S: p => String(p.second).padStart(2, '0'),
	s: p => String(p.second).padStart(2, '0'),
	f: (_, ms) => String(Math.floor(ms - Math.floor(ms / 1000) * 1000) * 1000).padStart(6, '0'),
	p: p => (p.hour < 12 ? 'AM' : 'PM'),
	u: p => String(p.weekday),
	w: p => String(p.weekday % 7),
	a: p => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][p.weekday - 1]!,
	W: p => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][p.weekday - 1]!,
	j: p => String(dayOfYear(p)).padStart(3, '0'),
	F: p => `${FORMAT_CODES.Y!(p, 0)}-${FORMAT_CODES.m!(p, 0)}-${FORMAT_CODES.d!(p, 0)}`,
	D: p => `${FORMAT_CODES.m!(p, 0)}/${FORMAT_CODES.d!(p, 0)}/${FORMAT_CODES.y!(p, 0)}`,
	T: p => `${FORMAT_CODES.H!(p, 0)}:${FORMAT_CODES.i!(p, 0)}:${FORMAT_CODES.S!(p, 0)}`,
	R: p => `${FORMAT_CODES.H!(p, 0)}:${FORMAT_CODES.i!(p, 0)}`,
	n: () => '\n',
	t: () => '\t',
	'%': () => '%',
}

const dayOfYear = (p: { year: number; month: number; day: number }) =>
	partsToDay(p.year, p.month, p.day) - partsToDay(p.year, 1, 1) + 1

// ---------------------------------------------------------------
// arithmetic

define('plus', {
	call: ([a, b], ctx) => {
		if (b instanceof IntervalValue) return addInterval(a!, b, 1, ctx)
		if (a instanceof IntervalValue) return addInterval(b!, a, 1, ctx)
		if (a instanceof DateValue && isNumeric(b!)) return new DateValue(a.days + integer(b!), a.wide)
		if (a instanceof DateTimeValue && isNumeric(b!))
			return new DateTimeValue(a.ms + toNumber(b!) * 1000, a.scale, a.timeZone)
		if (isNumeric(a!) && b instanceof DateValue) return new DateValue(b.days + integer(a!), b.wide)
		if (isNumeric(a!) && b instanceof DateTimeValue)
			return new DateTimeValue(b.ms + toNumber(a!) * 1000, b.scale, b.timeZone)

		return arithmetic(
			a!,
			b!,
			(x, y) => x + y,
			(x, y) => x + y
		)
	},
	min: 2,
	max: 2,
})

define('minus', {
	call: ([a, b], ctx) => {
		if (b instanceof IntervalValue) return addInterval(a!, b, -1, ctx)
		if (a instanceof DateValue && b instanceof DateValue) return a.days - b.days
		if (a instanceof DateTimeValue && b instanceof DateTimeValue) return Math.round((a.ms - b.ms) / 1000)
		if (a instanceof DateValue && isNumeric(b!)) return new DateValue(a.days - integer(b!), a.wide)
		if (a instanceof DateTimeValue && isNumeric(b!))
			return new DateTimeValue(a.ms - toNumber(b!) * 1000, a.scale, a.timeZone)

		return arithmetic(
			a!,
			b!,
			(x, y) => x - y,
			(x, y) => x - y
		)
	},
	min: 2,
	max: 2,
})

define('multiply', {
	call: ([a, b]) =>
		b instanceof IntervalValue
			? new IntervalValue(b.unit, b.count * toNumber(a!))
			: a instanceof IntervalValue
				? new IntervalValue(a.unit, a.count * toNumber(b!))
				: arithmetic(
						a!,
						b!,
						(x, y) => x * y,
						(x, y) => x * y
					),
	min: 2,
	max: 2,
})
define('divide', { call: ([a, b]) => toNumber(a!) / toNumber(b!), min: 2, max: 2 })

define('intDiv', {
	call: ([a, b]) => {
		if (toNumber(b!) === 0) throw illegalDivision('Division by zero')
		return arithmetic(
			a!,
			b!,
			(x, y) => Math.trunc(x / y),
			(x, y) => x / y
		)
	},
	min: 2,
	max: 2,
})

define('intDivOrZero', {
	call: ([a, b]) =>
		toNumber(b!) === 0
			? 0
			: arithmetic(
					a!,
					b!,
					(x, y) => Math.trunc(x / y),
					(x, y) => x / y
				),
	min: 2,
	max: 2,
})

define(
	['modulo', 'mod'],
	{
		call: ([a, b]) => {
			if ((Number.isInteger(toNumber(a!)) || typeof a === 'bigint') && toNumber(b!) === 0)
				throw illegalDivision('Division by zero')
			return arithmetic(
				a!,
				b!,
				(x, y) => x % y,
				(x, y) => x % y
			)
		},
		min: 2,
		max: 2,
	},
	true
)

define('moduloOrZero', {
	call: ([a, b]) =>
		toNumber(b!) === 0
			? 0
			: arithmetic(
					a!,
					b!,
					(x, y) => x % y,
					(x, y) => x % y
				),
	min: 2,
	max: 2,
})
define('positiveModulo', {
	call: ([a, b]) => {
		const m = toNumber(b!)
		return ((toNumber(a!) % m) + m) % m
	},
	min: 2,
	max: 2,
})
define('negate', {
	call: ([a]) =>
		a instanceof IntervalValue
			? new IntervalValue(a.unit, -a.count)
			: typeof a === 'bigint'
				? normalizeNumber(-a)
				: -toNumber(a!),
	min: 1,
	max: 1,
})
define(
	'abs',
	{ call: ([a]) => (typeof a === 'bigint' ? (a < 0n ? -a : a) : Math.abs(toNumber(a!))), min: 1, max: 1 },
	true
)
define('sign', { call: ([a]) => Math.sign(toNumber(a!)), min: 1, max: 1 }, true)
define(['sqrt'], { call: ([a]) => Math.sqrt(toNumber(a!)), min: 1, max: 1 }, true)
define(['cbrt'], { call: ([a]) => Math.cbrt(toNumber(a!)), min: 1, max: 1 })
define(['exp'], { call: ([a]) => Math.exp(toNumber(a!)), min: 1, max: 1 }, true)
define(['log', 'ln'], { call: ([a]) => Math.log(toNumber(a!)), min: 1, max: 1 }, true)
define(['log2'], { call: ([a]) => Math.log2(toNumber(a!)), min: 1, max: 1 }, true)
define(['log10'], { call: ([a]) => Math.log10(toNumber(a!)), min: 1, max: 1 }, true)
define(['exp2'], { call: ([a]) => 2 ** toNumber(a!), min: 1, max: 1 })
define(['exp10'], { call: ([a]) => 10 ** toNumber(a!), min: 1, max: 1 })
define(['pow', 'power'], { call: ([a, b]) => toNumber(a!) ** toNumber(b!), min: 2, max: 2 }, true)
define('pi', { call: () => Math.PI, min: 0, max: 0 }, true)
define('e', { call: () => Math.E, min: 0, max: 0 })
define(['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].join(',').split(','), { call: () => 0 })

for (const name of ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'] as const) {
	define(name, { call: ([a]) => Math[name](toNumber(a!)), min: 1, max: 1 }, true)
}

define('atan2', { call: ([a, b]) => Math.atan2(toNumber(a!), toNumber(b!)), min: 2, max: 2 }, true)

const roundTo = (value: number, digits: number, mode: (x: number) => number) => {
	const factor = 10 ** digits
	return mode(value * factor) / factor
}

// Half away from zero for floats like ClickHouse's round on decimals.
const roundHalfEven = (x: number) => {
	const floor = Math.floor(x)
	const diff = x - floor
	if (diff > 0.5) return floor + 1
	if (diff < 0.5) return floor
	return floor % 2 === 0 ? floor : floor + 1
}

define(
	'round',
	{
		call: ([a, n]) =>
			typeof a === 'bigint' ? a : roundTo(toNumber(a!), n === undefined ? 0 : integer(n), roundHalfEven),
		min: 1,
		max: 2,
	},
	true
)
define('roundBankers', {
	call: ([a, n]) => roundTo(toNumber(a!), n === undefined ? 0 : integer(n), roundHalfEven),
	min: 1,
	max: 2,
})
define(
	'floor',
	{
		call: ([a, n]) =>
			typeof a === 'bigint' ? a : roundTo(toNumber(a!), n === undefined ? 0 : integer(n), Math.floor),
		min: 1,
		max: 2,
	},
	true
)
define(
	['ceil', 'ceiling'],
	{
		call: ([a, n]) =>
			typeof a === 'bigint' ? a : roundTo(toNumber(a!), n === undefined ? 0 : integer(n), Math.ceil),
		min: 1,
		max: 2,
	},
	true
)
define(
	['trunc', 'truncate'],
	{
		call: ([a, n]) =>
			typeof a === 'bigint' ? a : roundTo(toNumber(a!), n === undefined ? 0 : integer(n), Math.trunc),
		min: 1,
		max: 2,
	},
	true
)
define('isNaN', { call: ([a]) => bool(Number.isNaN(toNumber(a!))), min: 1, max: 1 })
define('isFinite', { call: ([a]) => bool(Number.isFinite(toNumber(a!))), min: 1, max: 1 })
define('isInfinite', { call: ([a]) => bool(Math.abs(toNumber(a!)) === Infinity), min: 1, max: 1 })
define('gcd', {
	call: ([a, b]) => {
		let x = Math.abs(integer(a!))
		let y = Math.abs(integer(b!))
		while (y) [x, y] = [y, x % y]
		return x
	},
	min: 2,
	max: 2,
})
define('lcm', {
	call: ([a, b]) => {
		const x = Math.abs(integer(a!))
		const y = Math.abs(integer(b!))
		let g = x
		let h = y
		while (h) [g, h] = [h, g % h]
		return g === 0 ? 0 : (x / g) * y
	},
	min: 2,
	max: 2,
})
define('bitAnd', { call: ([a, b]) => normalizeNumber(BigInt(integer(a!)) & BigInt(integer(b!))), min: 2, max: 2 })
define('bitOr', { call: ([a, b]) => normalizeNumber(BigInt(integer(a!)) | BigInt(integer(b!))), min: 2, max: 2 })
define('bitXor', { call: ([a, b]) => normalizeNumber(BigInt(integer(a!)) ^ BigInt(integer(b!))), min: 2, max: 2 })
define('bitNot', { call: ([a]) => normalizeNumber(~BigInt(integer(a!))), min: 1, max: 1 })
define('bitShiftLeft', {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a!)) << BigInt(integer(b!))),
	min: 2,
	max: 2,
})
define('bitShiftRight', {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a!)) >> BigInt(integer(b!))),
	min: 2,
	max: 2,
})
define('bitTest', { call: ([a, b]) => Number((BigInt(integer(a!)) >> BigInt(integer(b!))) & 1n), min: 2, max: 2 })

define(
	['greatest'],
	{
		call: args => {
			if (args.some(arg => arg === null)) return null
			return args.reduce((best, arg) => (compareValues(arg, best) > 0 ? arg : best))
		},
		handlesNull: true,
		min: 1,
	},
	true
)

define(
	['least'],
	{
		call: args => {
			if (args.some(arg => arg === null)) return null
			return args.reduce((best, arg) => (compareValues(arg, best) < 0 ? arg : best))
		},
		handlesNull: true,
		min: 1,
	},
	true
)

// ---------------------------------------------------------------
// comparison & logic

// Comparing a date with a string reads the string as a date in the same
// zone, like ClickHouse converts the literal to the column's type.
export const coerceForComparison = (a: Value, b: Value, ctx: FunctionContext): [Value, Value] => {
	if (a instanceof DateTimeValue && typeof b === 'string')
		return [a, new DateTimeValue(parseDateTime(b, a.timeZone ?? ctx.serverTimeZone), a.scale)]
	if (b instanceof DateTimeValue && typeof a === 'string')
		return [new DateTimeValue(parseDateTime(a, b.timeZone ?? ctx.serverTimeZone), b.scale), b]
	if (a instanceof DateValue && typeof b === 'string') return [a, castValue(b, { name: 'Date' })]
	if (b instanceof DateValue && typeof a === 'string') return [castValue(a, { name: 'Date' }), b]
	if (isNumeric(a) && typeof b === 'string' && b.trim() !== '' && !Number.isNaN(Number(b))) return [a, Number(b)]
	if (isNumeric(b) && typeof a === 'string' && a.trim() !== '' && !Number.isNaN(Number(a))) return [Number(a), b]
	if (typeof a === 'boolean' && typeof b === 'string') return [a, b === 'true' || b === '1']
	if (typeof b === 'boolean' && typeof a === 'string') return [a === 'true' || a === '1', b]

	return [a, b]
}

const compare = (test: (result: number) => boolean) => ({
	call: ([a, b]: Value[], ctx: FunctionContext) => {
		const [x, y] = coerceForComparison(a!, b!, ctx)
		if (typeof x === 'number' && Number.isNaN(x)) return 0
		if (typeof y === 'number' && Number.isNaN(y)) return 0
		return bool(test(compareValues(x, y)))
	},
	min: 2,
	max: 2,
})

define(
	'equals',
	compare(result => result === 0)
)
define(
	'notEquals',
	compare(result => result !== 0)
)
define(
	'less',
	compare(result => result < 0)
)
define(
	'greater',
	compare(result => result > 0)
)
define(
	'lessOrEquals',
	compare(result => result <= 0)
)
define(
	'greaterOrEquals',
	compare(result => result >= 0)
)

// AND & OR with three valued logic: false wins over NULL for AND, true
// wins over NULL for OR.
define('and', {
	call: args => {
		let unknown = false
		for (const arg of args) {
			if (arg === null) unknown = true
			else if (!truthy(arg)) return 0
		}
		return unknown ? null : 1
	},
	handlesNull: true,
	min: 2,
})

define('or', {
	call: args => {
		let unknown = false
		for (const arg of args) {
			if (arg === null) unknown = true
			else if (truthy(arg)) return 1
		}
		return unknown ? null : 0
	},
	handlesNull: true,
	min: 2,
})

define('xor', { call: args => bool(args.filter(truthy).length % 2 === 1), min: 2 })
define('not', { call: ([a]) => bool(!truthy(a!)), min: 1, max: 1 }, true)

// ---------------------------------------------------------------
// conditionals & nulls

define(
	'if',
	{
		call: ([condition, then, otherwise]) => (truthy(condition!) ? then! : otherwise!),
		handlesNull: true,
		min: 3,
		max: 3,
	},
	true
)

define('multiIf', {
	call: args => {
		for (let i = 0; i + 1 < args.length; i += 2) {
			if (truthy(args[i]!)) return args[i + 1]!
		}
		return args.at(-1)!
	},
	handlesNull: true,
	min: 3,
})

define('caseWithExpression', {
	call: ([subject, ...rest], ctx) => {
		for (let i = 0; i + 1 < rest.length; i += 2) {
			const [x, y] = coerceForComparison(subject!, rest[i]!, ctx)
			if (subject !== null && rest[i] !== null && compareValues(x, y) === 0) return rest[i + 1]!
		}
		return rest.at(-1)!
	},
	handlesNull: true,
	min: 3,
})

define('coalesce', { call: args => args.find(arg => arg !== null) ?? null, handlesNull: true, min: 1 }, true)
define('ifNull', { call: ([a, b]) => (a === null ? b! : a!), handlesNull: true, min: 2, max: 2 }, true)
define(
	'nullIf',
	{
		call: ([a, b], ctx) =>
			a !== null && b !== null && compareValues(...coerceForComparison(a!, b!, ctx)) === 0 ? null : a!,
		handlesNull: true,
		min: 2,
		max: 2,
	},
	true
)
define('isNull', { call: ([a]) => bool(a === null), handlesNull: true, min: 1, max: 1 }, true)
define('isNotNull', { call: ([a]) => bool(a !== null), handlesNull: true, min: 1, max: 1 }, true)
define('isZeroOrNull', { call: ([a]) => bool(a === null || toNumber(a!) === 0), handlesNull: true, min: 1, max: 1 })
define('assumeNotNull', { call: ([a]) => a ?? 0, handlesNull: true, min: 1, max: 1 })
define('toNullable', { call: ([a]) => a!, handlesNull: true, min: 1, max: 1 })
define(['materialize', 'identity'], { call: ([a]) => a!, handlesNull: true, min: 1, max: 1 })
define('ignore', { call: () => 0, handlesNull: true })

define('throwIf', {
	call: ([condition, message]) => {
		if (truthy(condition!)) {
			throw new (class extends Error {})(
				message === undefined ? "Value passed to 'throwIf' function is non-zero" : stringOf(message)
			)
		}
		return 0
	},
	min: 1,
	max: 2,
})

// ---------------------------------------------------------------
// conversion

const converter = (type: string, orNull = false, orZero = false) => ({
	call: ([value, ...rest]: Value[]) => {
		try {
			const extra = type.startsWith('Decimal') ? `(${integer(rest[0] ?? 0)})` : ''
			return castValue(value!, parseType(`${type}${extra}`))
		} catch (error) {
			if (orNull) return null
			if (orZero) return defaultValue(parseType(type.startsWith('Decimal') ? `${type}(0)` : type))
			throw error
		}
	},
	handlesNull: orNull || orZero,
	min: 1,
})

for (const type of [
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
	'Decimal32',
	'Decimal64',
	'Decimal128',
	'Decimal256',
	'UUID',
	'Bool',
	'Date',
	'Date32',
]) {
	define(`to${type}`, converter(type))
	define(`to${type}OrNull`, converter(type, true))
	define(`to${type}OrZero`, converter(type, false, true))
	define(`to${type}OrDefault`, converter(type, false, true))
}

define('toBoolean', converter('Bool'))
define('toString', {
	call: ([value, tz]) =>
		value instanceof DateTimeValue && tz !== undefined
			? formatDateTimeValue(new DateTimeValue(value.ms, value.scale, tzArg(tz)))
			: stringOf(value!),
	min: 1,
	max: 2,
})
define('toFixedString', { call: ([value]) => stringOf(value!), min: 2, max: 2 })

const dateTimeOf = (value: Value, scale: number, timeZone: string | undefined, ctx: FunctionContext) => {
	if (value instanceof DateTimeValue)
		return new DateTimeValue(quantize(value.ms, scale), scale, timeZone ?? value.timeZone)
	if (value instanceof DateValue)
		return new DateTimeValue(
			fromParts(1970, 1, 1 + value.days, 0, 0, 0, timeZone ?? ctx.serverTimeZone),
			scale,
			timeZone
		)
	if (typeof value === 'string')
		return new DateTimeValue(quantize(parseDateTime(value, timeZone ?? ctx.serverTimeZone), scale), scale, timeZone)

	return new DateTimeValue(quantize(toNumber(value) * 1000, scale), scale, timeZone)
}

define('toDateTime', { call: ([value, tz], ctx) => dateTimeOf(value!, 0, tzArg(tz), ctx), min: 1, max: 2 })
define('toDateTimeOrNull', {
	call: ([value, tz], ctx) => {
		try {
			return value === null ? null : dateTimeOf(value!, 0, tzArg(tz), ctx)
		} catch {
			return null
		}
	},
	handlesNull: true,
	min: 1,
	max: 2,
})
define('toDateTimeOrZero', {
	call: ([value, tz], ctx) => {
		try {
			return dateTimeOf(value!, 0, tzArg(tz), ctx)
		} catch {
			return new DateTimeValue(0, 0, tzArg(tz))
		}
	},
	min: 1,
	max: 2,
})
define('toDateTime64', {
	call: ([value, scale, tz], ctx) => dateTimeOf(value!, integer(scale!), tzArg(tz), ctx),
	min: 2,
	max: 3,
})
define('toDateTime64OrNull', {
	call: ([value, scale, tz], ctx) => {
		try {
			return value === null ? null : dateTimeOf(value!, integer(scale ?? 3), tzArg(tz), ctx)
		} catch {
			return null
		}
	},
	handlesNull: true,
	min: 1,
	max: 3,
})
define(['parseDateTimeBestEffort', 'parseDateTimeBestEffortUS'], {
	call: ([value, tz], ctx) => dateTimeOf(asString(value!, 'parseDateTimeBestEffort'), 0, tzArg(tz), ctx),
	min: 1,
	max: 2,
})
define(['parseDateTimeBestEffortOrNull', 'parseDateTimeBestEffortUSOrNull'], {
	call: ([value, tz], ctx) => {
		try {
			return dateTimeOf(stringOf(value!), 0, tzArg(tz), ctx)
		} catch {
			return null
		}
	},
	min: 1,
	max: 2,
})
define(['parseDateTimeBestEffortOrZero'], {
	call: ([value, tz], ctx) => {
		try {
			return dateTimeOf(stringOf(value!), 0, tzArg(tz), ctx)
		} catch {
			return new DateTimeValue(0, 0, tzArg(tz))
		}
	},
	min: 1,
	max: 2,
})
define('parseDateTime64BestEffort', {
	call: ([value, scale, tz], ctx) => dateTimeOf(stringOf(value!), integer(scale ?? 3), tzArg(tz), ctx),
	min: 1,
	max: 3,
})
define('parseDateTime64BestEffortOrNull', {
	call: ([value, scale, tz], ctx) => {
		try {
			return dateTimeOf(stringOf(value!), integer(scale ?? 3), tzArg(tz), ctx)
		} catch {
			return null
		}
	},
	min: 1,
	max: 3,
})
define(['toUnixTimestamp'], {
	call: ([value, tz], ctx) =>
		typeof value === 'string'
			? Math.floor(parseDateTime(value, tzArg(tz, ctx.serverTimeZone)!) / 1000)
			: Math.floor(msOf(value!, ctx.serverTimeZone) / 1000),
	min: 1,
	max: 2,
})
define('toUnixTimestamp64Milli', { call: ([value]) => Math.floor((value as DateTimeValue).ms), min: 1, max: 1 })
define('toUnixTimestamp64Micro', { call: ([value]) => Math.floor((value as DateTimeValue).ms * 1000), min: 1, max: 1 })
define('toUnixTimestamp64Second', { call: ([value]) => Math.floor((value as DateTimeValue).ms / 1000), min: 1, max: 1 })
define(
	['fromUnixTimestamp', 'FROM_UNIXTIME'],
	{ call: ([value, tz]) => new DateTimeValue(integer(value!) * 1000, 0, tzArg(tz)), min: 1, max: 2 },
	true
)
define('fromUnixTimestamp64Milli', {
	call: ([value, tz]) => new DateTimeValue(toNumber(value!), 3, tzArg(tz)),
	min: 1,
	max: 2,
})
define('fromUnixTimestamp64Micro', {
	call: ([value, tz]) => new DateTimeValue(toNumber(value!) / 1000, 6, tzArg(tz)),
	min: 1,
	max: 2,
})
define(
	['CAST', '_CAST', 'accurateCast'],
	{ call: ([value, type]) => castValue(value!, parseType(stringOf(type!))), handlesNull: true, min: 2, max: 2 },
	true
)
define('accurateCastOrNull', {
	call: ([value, type]) => {
		try {
			return castValue(value!, { name: 'Nullable', inner: parseType(stringOf(type!)) })
		} catch {
			return null
		}
	},
	handlesNull: true,
	min: 2,
	max: 2,
})
define('reinterpretAsString', { call: ([value]) => stringOf(value!), min: 1, max: 1 })

// ---------------------------------------------------------------
// dates & times

define(
	'now',
	{ call: ([tz], ctx) => new DateTimeValue(Math.floor(ctx.now / 1000) * 1000, 0, tzArg(tz)), min: 0, max: 1 },
	true
)
define(['now64'], {
	call: ([scale, tz], ctx) => new DateTimeValue(ctx.now, scale === undefined ? 3 : integer(scale), tzArg(tz)),
	min: 0,
	max: 2,
})
define(
	['today', 'curdate', 'current_date'],
	{ call: (_, ctx) => new DateValue(dayNumberIn(ctx.now, ctx.serverTimeZone)), min: 0, max: 0 },
	true
)
define('yesterday', { call: (_, ctx) => new DateValue(dayNumberIn(ctx.now, ctx.serverTimeZone) - 1), min: 0, max: 0 })
define(['timeZone', 'timezone', 'serverTimeZone', 'serverTimezone'], {
	call: (_, ctx) => ctx.serverTimeZone,
	min: 0,
	max: 0,
})
define(['toTimeZone', 'toTimezone'], {
	call: ([value, tz], ctx) =>
		new DateTimeValue(
			msOf(value!, ctx.serverTimeZone),
			value instanceof DateTimeValue ? value.scale : 0,
			tzArg(tz)
		),
	min: 2,
	max: 2,
})
define(['timeZoneOf', 'timezoneOf'], {
	call: ([value], ctx) =>
		value instanceof DateTimeValue ? (value.timeZone ?? ctx.serverTimeZone) : ctx.serverTimeZone,
	min: 1,
	max: 1,
})

define(['toYear', 'YEAR'], { call: ([value, tz], ctx) => datePart(value!, ctx, tz).year, min: 1, max: 2 }, true)
define(
	['toQuarter', 'QUARTER'],
	{ call: ([value, tz], ctx) => Math.floor((datePart(value!, ctx, tz).month - 1) / 3) + 1, min: 1, max: 2 },
	true
)
define(['toMonth', 'MONTH'], { call: ([value, tz], ctx) => datePart(value!, ctx, tz).month, min: 1, max: 2 }, true)
define(
	['toDayOfMonth', 'DAY', 'DAYOFMONTH'],
	{ call: ([value, tz], ctx) => datePart(value!, ctx, tz).day, min: 1, max: 2 },
	true
)
define(
	['toDayOfYear', 'DAYOFYEAR'],
	{ call: ([value, tz], ctx) => dayOfYear(datePart(value!, ctx, tz)), min: 1, max: 2 },
	true
)
define(['toHour', 'HOUR'], { call: ([value, tz], ctx) => datePart(value!, ctx, tz).hour, min: 1, max: 2 }, true)
define(['toMinute', 'MINUTE'], { call: ([value, tz], ctx) => datePart(value!, ctx, tz).minute, min: 1, max: 2 }, true)
define(['toSecond', 'SECOND'], { call: ([value, tz], ctx) => datePart(value!, ctx, tz).second, min: 1, max: 2 }, true)
define('toMillisecond', {
	call: ([value]) => (value instanceof DateTimeValue ? Math.floor(value.ms - Math.floor(value.ms / 1000) * 1000) : 0),
	min: 1,
	max: 2,
})

define(
	['toDayOfWeek', 'DAYOFWEEK'],
	{
		call: ([value, mode, tz], ctx) => {
			const { weekday } = datePart(value!, ctx, tz)
			const m = mode === undefined ? 0 : integer(mode)
			// Modes 0 & 1 count from Monday, 2 & 3 from Sunday; odd modes start at 0.
			const base = m >= 2 ? weekday % 7 : weekday - 1
			return m % 2 === 1 ? base : base + 1
		},
		min: 1,
		max: 3,
	},
	true
)

define('toISOWeek', {
	call: ([value, tz], ctx) => {
		const p = datePart(value!, ctx, tz)
		const date = new Date(Date.UTC(p.year, p.month - 1, p.day))
		date.setUTCDate(date.getUTCDate() + 4 - p.weekday)
		const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
		return Math.ceil(((date.getTime() - start.getTime()) / 86_400_000 + 1) / 7)
	},
	min: 1,
	max: 2,
})

define('toISOYear', {
	call: ([value, tz], ctx) => {
		const p = datePart(value!, ctx, tz)
		const date = new Date(Date.UTC(p.year, p.month - 1, p.day))
		date.setUTCDate(date.getUTCDate() + 4 - p.weekday)
		return date.getUTCFullYear()
	},
	min: 1,
	max: 2,
})

define('toYYYYMM', {
	call: ([value, tz], ctx) => {
		const p = datePart(value!, ctx, tz)
		return p.year * 100 + p.month
	},
	min: 1,
	max: 2,
})
define('toYYYYMMDD', {
	call: ([value, tz], ctx) => {
		const p = datePart(value!, ctx, tz)
		return p.year * 10000 + p.month * 100 + p.day
	},
	min: 1,
	max: 2,
})
define('toYYYYMMDDhhmmss', {
	call: ([value, tz], ctx) => {
		const p = datePart(value!, ctx, tz)
		return normalizeNumber(
			BigInt(p.year * 10000 + p.month * 100 + p.day) * 1000000n +
				BigInt(p.hour * 10000 + p.minute * 100 + p.second)
		)
	},
	min: 1,
	max: 2,
})

define('toDate', {
	call: ([value, tz], ctx) => {
		if (value instanceof DateValue) return new DateValue(value.days)
		if (value instanceof DateTimeValue)
			return new DateValue(dayNumberIn(value.ms, tzArg(tz, value.timeZone ?? ctx.serverTimeZone)!))
		if (typeof value === 'string') {
			if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.trim())) return castValue(value, { name: 'Date' })
			return new DateValue(
				dayNumberIn(parseDateTime(value, tzArg(tz, ctx.serverTimeZone)!), tzArg(tz, ctx.serverTimeZone)!)
			)
		}

		const number = toNumber(value!)
		// Numbers up to 65535 are days, larger ones unix timestamps.
		return new DateValue(
			number <= 65535 ? Math.trunc(number) : dayNumberIn(number * 1000, tzArg(tz, ctx.serverTimeZone)!)
		)
	},
	min: 1,
	max: 2,
})

define('toDate32', {
	call: ([value, tz], ctx) => {
		const date = findFunction('toDate')!.call([value!, ...(tz === undefined ? [] : [tz])], ctx) as DateValue
		return new DateValue(date.days, true)
	},
	min: 1,
	max: 2,
})
define(['toStartOfYear'], { call: ([value, tz], ctx) => startOf(value!, ctx, 'year', tz), min: 1, max: 2 })
define(['toStartOfQuarter'], { call: ([value, tz], ctx) => startOf(value!, ctx, 'quarter', tz), min: 1, max: 2 })
define(['toStartOfMonth'], { call: ([value, tz], ctx) => startOf(value!, ctx, 'month', tz), min: 1, max: 2 })
define(['toMonday'], { call: ([value, tz], ctx) => startOf(value!, ctx, 'week', tz, 1), min: 1, max: 2 })
define(['toStartOfWeek'], {
	call: ([value, mode, tz], ctx) => startOf(value!, ctx, 'week', tz, mode === undefined ? 0 : integer(mode)),
	min: 1,
	max: 3,
})
define(['toStartOfDay'], { call: ([value, tz], ctx) => startOf(value!, ctx, 'day', tz), min: 1, max: 2 })
define(['toStartOfHour'], { call: ([value, tz], ctx) => startOfTime(value!, ctx, 3600, tz), min: 1, max: 2 })
define(['toStartOfMinute'], { call: ([value, tz], ctx) => startOfTime(value!, ctx, 60, tz), min: 1, max: 2 })
define(['toStartOfSecond'], {
	call: ([value]) =>
		new DateTimeValue(
			Math.floor((value as DateTimeValue).ms / 1000) * 1000,
			(value as DateTimeValue).scale,
			(value as DateTimeValue).timeZone
		),
	min: 1,
	max: 2,
})
define(['toStartOfFiveMinutes', 'toStartOfFiveMinute'], {
	call: ([value, tz], ctx) => startOfTime(value!, ctx, 300, tz),
	min: 1,
	max: 2,
})
define(['toStartOfTenMinutes'], { call: ([value, tz], ctx) => startOfTime(value!, ctx, 600, tz), min: 1, max: 2 })
define(['toStartOfFifteenMinutes'], { call: ([value, tz], ctx) => startOfTime(value!, ctx, 900, tz), min: 1, max: 2 })

define(['toStartOfInterval', 'time_bucket'], {
	call: ([value, interval, tz], ctx) => {
		if (!(interval instanceof IntervalValue))
			throw illegalType('The second argument of toStartOfInterval must be an interval')

		const count = interval.count

		switch (interval.unit) {
			case 'Year': {
				const year = datePart(value!, ctx, tz).year
				return new DateValue(partsToDay(year - (year % count), 1, 1))
			}
			case 'Quarter':
			case 'Month': {
				const p = datePart(value!, ctx, tz)
				const months = p.year * 12 + p.month - 1
				const step = count * (interval.unit === 'Quarter' ? 3 : 1)
				const start = months - (months % step)
				return new DateValue(partsToDay(Math.floor(start / 12), (start % 12) + 1, 1))
			}
			case 'Week': {
				const monday = startOf(value!, ctx, 'week', tz, 1) as DateValue
				const weeks = Math.floor((monday.days + 3) / 7)
				return new DateValue((weeks - (weeks % count)) * 7 - 3)
			}
			case 'Day': {
				const timeZone = zoneOf(value!, ctx, tz)
				const day = value instanceof DateValue ? value.days : dayNumberIn(msOf(value!, timeZone), timeZone)
				const start = day - (day % count)
				return new DateTimeValue(
					fromParts(1970, 1, 1 + start, 0, 0, 0, timeZone),
					0,
					value instanceof DateTimeValue || tz !== undefined ? timeZone : undefined
				)
			}
			default:
				return startOfTime(value!, ctx, (UNIT_MS[interval.unit]! * count) / 1000, tz)
		}
	},
	min: 2,
	max: 3,
})

define(
	['date_trunc', 'dateTrunc', 'DATE_TRUNC'],
	{
		call: ([unit, value, tz], ctx) => {
			const which = unitOf(unit!)
			if (which === 'Year') return startOf(value!, ctx, 'year', tz)
			if (which === 'Quarter') return startOf(value!, ctx, 'quarter', tz)
			if (which === 'Month') return startOf(value!, ctx, 'month', tz)
			if (which === 'Week') return startOf(value!, ctx, 'week', tz, 1)
			if (which === 'Day') return startOf(value!, ctx, 'day', tz)
			if (which === 'Hour') return startOfTime(value!, ctx, 3600, tz)
			if (which === 'Minute') return startOfTime(value!, ctx, 60, tz)
			return startOfTime(value!, ctx, 1, tz)
		},
		min: 2,
		max: 3,
	},
	true
)

for (const unit of [
	'Nanosecond',
	'Microsecond',
	'Millisecond',
	'Second',
	'Minute',
	'Hour',
	'Day',
	'Week',
	'Month',
	'Quarter',
	'Year',
] as IntervalUnit[]) {
	define(`toInterval${unit}`, toInterval(unit))
	define(`add${unit}s`, {
		call: ([value, count], ctx) => addInterval(value!, new IntervalValue(unit, toNumber(count!)), 1, ctx),
		min: 2,
		max: 2,
	})
	define(`subtract${unit}s`, {
		call: ([value, count], ctx) => addInterval(value!, new IntervalValue(unit, toNumber(count!)), -1, ctx),
		min: 2,
		max: 2,
	})
}

define(
	['dateAdd', 'date_add', 'DATE_ADD', 'timestampAdd', 'timestamp_add'],
	{
		call: (args, ctx) => {
			if (args.length === 2) return addInterval(args[0]!, args[1] as IntervalValue, 1, ctx)
			return addInterval(args[2]!, new IntervalValue(unitOf(args[0]!), toNumber(args[1]!)), 1, ctx)
		},
		min: 2,
		max: 3,
	},
	true
)

define(
	['dateSub', 'date_sub', 'DATE_SUB', 'timestampSub', 'timestamp_sub'],
	{
		call: (args, ctx) => {
			if (args.length === 2) return addInterval(args[0]!, args[1] as IntervalValue, -1, ctx)
			return addInterval(args[2]!, new IntervalValue(unitOf(args[0]!), toNumber(args[1]!)), -1, ctx)
		},
		min: 2,
		max: 3,
	},
	true
)

define(
	['dateDiff', 'date_diff', 'DATE_DIFF', 'timestampDiff', 'timestamp_diff'],
	{ call: ([unit, a, b, tz], ctx) => dateDiff(unitOf(unit!), a!, b!, ctx, tz), min: 3, max: 4 },
	true
)
define('age', {
	call: ([unit, a, b, tz], ctx) => {
		const u = unitOf(unit!)
		const diff = dateDiff(u, a!, b!, ctx, tz)
		return diff
	},
	min: 3,
	max: 4,
})

define(
	['formatDateTime', 'DATE_FORMAT'],
	{
		call: ([value, format, tz], ctx) => {
			const timeZone = zoneOf(value!, ctx, tz)
			const ms = msOf(value!, timeZone)
			const p = partsIn(ms, timeZone)

			return asString(format!, 'formatDateTime').replace(
				/%(.)/g,
				(match, code: string) => FORMAT_CODES[code]?.(p, ms) ?? match
			)
		},
		min: 2,
		max: 3,
	},
	true
)

define('makeDate', {
	call: ([year, month, day]) => new DateValue(partsToDay(integer(year!), integer(month!), integer(day!))),
	min: 3,
	max: 3,
})
define('makeDateTime', {
	call: ([year, month, day, hour, minute, second, tz], ctx) =>
		new DateTimeValue(
			fromParts(
				integer(year!),
				integer(month!),
				integer(day!),
				integer(hour!),
				integer(minute!),
				integer(second!),
				tzArg(tz, ctx.serverTimeZone)
			),
			0,
			tzArg(tz)
		),
	min: 6,
	max: 7,
})
define('toRelativeDayNum', {
	call: ([value, tz], ctx) =>
		value instanceof DateValue
			? value.days
			: dayNumberIn(msOf(value!, zoneOf(value!, ctx, tz)), zoneOf(value!, ctx, tz)),
	min: 1,
	max: 2,
})
define('toRelativeHourNum', { call: ([value]) => Math.floor(msOf(value!, 'UTC') / 3_600_000), min: 1, max: 2 })

// ---------------------------------------------------------------
// strings

define(
	['length', 'OCTET_LENGTH'],
	{
		call: ([value]) => {
			if (Array.isArray(value)) return value.length
			if (value instanceof Map) return value.size
			return Buffer.byteLength(stringOf(value!))
		},
		min: 1,
		max: 1,
	},
	true
)

define(
	['lengthUTF8', 'char_length', 'character_length', 'CHAR_LENGTH', 'CHARACTER_LENGTH'],
	{ call: ([value]) => [...stringOf(value!)].length, min: 1, max: 1 },
	true
)

define('empty', {
	call: ([value]) => {
		if (Array.isArray(value)) return bool(value.length === 0)
		if (value instanceof Map) return bool(value.size === 0)
		if (typeof value === 'string') return bool(value === '')
		if (value instanceof TupleValue) return bool(value.items.length === 0)
		return bool(stringOf(value!) === '')
	},
	min: 1,
	max: 1,
})

define('notEmpty', { call: (args, ctx) => bool(!findFunction('empty')!.call(args, ctx)), min: 1, max: 1 })
define(
	['lower', 'lcase', 'lowerUTF8'],
	{ call: ([value]) => asString(value!, 'lower').toLowerCase(), min: 1, max: 1 },
	true
)
define(
	['upper', 'ucase', 'upperUTF8'],
	{ call: ([value]) => asString(value!, 'upper').toUpperCase(), min: 1, max: 1 },
	true
)

define(
	['reverse', 'reverseUTF8'],
	{
		call: ([value]) => (Array.isArray(value) ? [...value].reverse() : [...stringOf(value!)].reverse().join('')),
		min: 1,
		max: 1,
	},
	true
)

define(
	['concat'],
	{
		call: args => {
			if (args.some(arg => arg === null)) return null
			return args.map(arg => stringOf(arg)).join('')
		},
		handlesNull: true,
	},
	true
)

define(
	['concatWithSeparator', 'concat_ws'],
	{
		call: ([separator, ...args]) =>
			args
				.filter(arg => arg !== null)
				.map(arg => stringOf(arg))
				.join(stringOf(separator!)),
		handlesNull: true,
		min: 1,
	},
	true
)

const substringBytes = (text: string, offset: number, length?: number) => {
	const bytes = Buffer.from(text)
	const start = offset > 0 ? offset - 1 : offset < 0 ? Math.max(bytes.length + offset, 0) : 0
	const end = length === undefined ? bytes.length : length < 0 ? bytes.length + length : start + length

	if (offset === 0) return ''

	return bytes.subarray(start, Math.max(start, end)).toString()
}

define(
	['substring', 'substr', 'mid', 'byteSlice'],
	{
		call: ([value, offset, length]) =>
			substringBytes(stringOf(value!), integer(offset!), length === undefined ? undefined : integer(length)),
		min: 2,
		max: 3,
	},
	true
)

define(['substringUTF8'], {
	call: ([value, offset, length]) => {
		const chars = [...stringOf(value!)]
		const o = integer(offset!)
		const start = o > 0 ? o - 1 : o < 0 ? Math.max(chars.length + o, 0) : 0
		const end =
			length === undefined
				? chars.length
				: integer(length) < 0
					? chars.length + integer(length)
					: start + integer(length)
		return o === 0 ? '' : chars.slice(start, end).join('')
	},
	min: 2,
	max: 3,
})

define(
	['left', 'leftUTF8'],
	{
		call: ([value, n]) => [...stringOf(value!)].slice(0, integer(n!) < 0 ? integer(n!) : integer(n!)).join(''),
		min: 2,
		max: 2,
	},
	true
)
define(
	['right', 'rightUTF8'],
	{
		call: ([value, n]) => {
			const chars = [...stringOf(value!)]
			const count = integer(n!)
			return count <= 0 ? chars.slice(-count || chars.length).join('') : chars.slice(-count).join('')
		},
		min: 2,
		max: 2,
	},
	true
)
define(
	['trimBoth'],
	{
		call: ([value, chars]) =>
			chars === undefined
				? stringOf(value!).replace(/^ +| +$/g, '')
				: trimChars(stringOf(value!), stringOf(chars), true, true),
		min: 1,
		max: 2,
	},
	true
)
define(['trimLeft'], { call: ([value]) => stringOf(value!).replace(/^ +/, ''), min: 1, max: 1 }, true)
define(['trimRight'], { call: ([value]) => stringOf(value!).replace(/ +$/, ''), min: 1, max: 1 }, true)

const trimChars = (text: string, chars: string, left: boolean, right: boolean) => {
	let start = 0
	let end = text.length
	while (left && start < end && chars.includes(text[start]!)) start++
	while (right && end > start && chars.includes(text[end - 1]!)) end--
	return text.slice(start, end)
}

define('startsWith', {
	call: ([value, prefix]) => bool(stringOf(value!).startsWith(stringOf(prefix!))),
	min: 2,
	max: 2,
})
define('endsWith', { call: ([value, suffix]) => bool(stringOf(value!).endsWith(stringOf(suffix!))), min: 2, max: 2 })

define(
	['position', 'locate'],
	{
		call: ([haystack, needle, start]) => {
			const bytes = Buffer.from(stringOf(haystack!))
			const index = bytes.indexOf(Buffer.from(stringOf(needle!)), start === undefined ? 0 : integer(start) - 1)
			return index + 1
		},
		min: 2,
		max: 3,
	},
	true
)

define(['positionCaseInsensitive', 'positionCaseInsensitiveUTF8'], {
	call: ([haystack, needle]) => stringOf(haystack!).toLowerCase().indexOf(stringOf(needle!).toLowerCase()) + 1,
	min: 2,
	max: 2,
})
define('positionUTF8', {
	call: ([haystack, needle]) => {
		const index = stringOf(haystack!).indexOf(stringOf(needle!))
		return index === -1 ? 0 : [...stringOf(haystack!).slice(0, index)].length + 1
	},
	min: 2,
	max: 3,
})
define('countSubstrings', {
	call: ([haystack, needle]) => {
		const n = stringOf(needle!)
		if (!n) return 0
		return stringOf(haystack!).split(n).length - 1
	},
	min: 2,
	max: 3,
})

// LIKE with % & _ wildcards & backslash escapes.
export const likePattern = (pattern: string, insensitive: boolean) => {
	let source = '^'

	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i]!

		if (char === '\\' && i + 1 < pattern.length) {
			source += pattern[++i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		} else if (char === '%') {
			source += '[\\s\\S]*'
		} else if (char === '_') {
			source += '[\\s\\S]'
		} else {
			source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		}
	}

	return new RegExp(`${source}$`, insensitive ? 'is' : 's')
}

const regexCache = new Map<string, RegExp>()

// re2 & JavaScript regexes agree on everything apps write in practice.
const regex = (pattern: string, flags = '') => {
	const key = `${flags}/${pattern}`
	let compiled = regexCache.get(key)

	if (!compiled) {
		try {
			compiled = new RegExp(pattern.replace(/\(\?i\)/g, ''), (pattern.includes('(?i)') ? 'i' : '') + flags)
		} catch {
			throw badArguments(`Invalid regular expression: ${pattern}`)
		}

		regexCache.set(key, compiled)
	}

	return compiled
}

define('like', {
	call: ([value, pattern]) => bool(likePattern(stringOf(pattern!), false).test(stringOf(value!))),
	min: 2,
	max: 2,
})
define('notLike', {
	call: ([value, pattern]) => bool(!likePattern(stringOf(pattern!), false).test(stringOf(value!))),
	min: 2,
	max: 2,
})
define('ilike', {
	call: ([value, pattern]) => bool(likePattern(stringOf(pattern!), true).test(stringOf(value!))),
	min: 2,
	max: 2,
})
define('notILike', {
	call: ([value, pattern]) => bool(!likePattern(stringOf(pattern!), true).test(stringOf(value!))),
	min: 2,
	max: 2,
})
define(['match', 'REGEXP_MATCHES'], {
	call: ([value, pattern]) => bool(regex(stringOf(pattern!)).test(stringOf(value!))),
	min: 2,
	max: 2,
})

define('extract', {
	call: ([value, pattern]) => {
		const match = regex(stringOf(pattern!)).exec(stringOf(value!))
		if (!match) return ''
		return match[1] ?? match[0]
	},
	min: 2,
	max: 2,
})

define('extractAll', {
	call: ([value, pattern]) =>
		[...stringOf(value!).matchAll(regex(stringOf(pattern!), 'g'))].map(match => match[1] ?? match[0]),
	min: 2,
	max: 2,
})
define('extractGroups', {
	call: ([value, pattern]) => {
		const match = regex(stringOf(pattern!)).exec(stringOf(value!))
		return match ? match.slice(1).map(group => group ?? '') : []
	},
	min: 2,
	max: 2,
})

define('replaceOne', {
	call: ([value, from, to]) => stringOf(value!).replace(stringOf(from!), () => stringOf(to!)),
	min: 3,
	max: 3,
})
define(
	['replaceAll', 'replace'],
	{
		call: ([value, from, to]) =>
			stringOf(from!) === ''
				? stringOf(value!)
				: stringOf(value!).replaceAll(stringOf(from!), () => stringOf(to!)),
		min: 3,
		max: 3,
	},
	true
)

// re2 replacements write groups as \1, JavaScript as $1.
const replacement = (text: string) => text.replace(/\$/g, '$$$$').replace(/\\(\d)/g, '$$$1')

define('replaceRegexpOne', {
	call: ([value, pattern, to]) => stringOf(value!).replace(regex(stringOf(pattern!)), replacement(stringOf(to!))),
	min: 3,
	max: 3,
})
define(['replaceRegexpAll', 'REGEXP_REPLACE'], {
	call: ([value, pattern, to]) =>
		stringOf(value!).replace(regex(stringOf(pattern!), 'g'), replacement(stringOf(to!))),
	min: 3,
	max: 3,
})

define('splitByChar', { call: ([separator, value]) => stringOf(value!).split(stringOf(separator!)), min: 2, max: 3 })
define('splitByString', {
	call: ([separator, value]) =>
		stringOf(separator!) === '' ? [...stringOf(value!)] : stringOf(value!).split(stringOf(separator!)),
	min: 2,
	max: 3,
})
define('splitByRegexp', {
	call: ([pattern, value]) => stringOf(value!).split(regex(stringOf(pattern!))),
	min: 2,
	max: 3,
})
define('splitByWhitespace', { call: ([value]) => stringOf(value!).split(/\s+/).filter(Boolean), min: 1, max: 2 })
define('splitByNonAlpha', {
	call: ([value]) =>
		stringOf(value!)
			.split(/[^a-zA-Z0-9]+/)
			.filter(Boolean),
	min: 1,
	max: 2,
})
define('arrayStringConcat', {
	call: ([array, separator]) =>
		asArray(array!, 'arrayStringConcat')
			.filter(item => item !== null)
			.map(item => stringOf(item))
			.join(separator === undefined ? '' : stringOf(separator)),
	min: 1,
	max: 2,
})
define(
	['repeat'],
	{ call: ([value, count]) => stringOf(value!).repeat(Math.max(0, integer(count!))), min: 2, max: 2 },
	true
)
define(
	['leftPad', 'lpad', 'leftPadUTF8'],
	{
		call: ([value, length, pad]) =>
			padText(stringOf(value!), integer(length!), pad === undefined ? ' ' : stringOf(pad), true),
		min: 2,
		max: 3,
	},
	true
)
define(
	['rightPad', 'rpad', 'rightPadUTF8'],
	{
		call: ([value, length, pad]) =>
			padText(stringOf(value!), integer(length!), pad === undefined ? ' ' : stringOf(pad), false),
		min: 2,
		max: 3,
	},
	true
)

const padText = (text: string, length: number, pad: string, left: boolean) => {
	if (text.length >= length) return text.slice(0, length)
	const fill = pad.repeat(Math.ceil((length - text.length) / Math.max(pad.length, 1))).slice(0, length - text.length)
	return left ? fill + text : text + fill
}

define(
	['base64Encode', 'TO_BASE64'],
	{ call: ([value]) => Buffer.from(stringOf(value!)).toString('base64'), min: 1, max: 1 },
	true
)
define(
	['base64Decode', 'FROM_BASE64'],
	{ call: ([value]) => Buffer.from(stringOf(value!), 'base64').toString(), min: 1, max: 1 },
	true
)
define('tryBase64Decode', { call: ([value]) => Buffer.from(stringOf(value!), 'base64').toString(), min: 1, max: 1 })
define(
	'hex',
	{
		call: ([value]) =>
			isNumeric(value!)
				? BigInt(integer(value!)).toString(16).toUpperCase().padStart(2, '0')
				: Buffer.from(stringOf(value!), 'latin1').toString('hex').toUpperCase(),
		min: 1,
		max: 1,
	},
	true
)
define('unhex', { call: ([value]) => Buffer.from(stringOf(value!), 'hex').toString('latin1'), min: 1, max: 1 }, true)
define(
	['MD5'],
	{ call: ([value]) => createHash('md5').update(stringOf(value!)).digest('latin1'), min: 1, max: 1 },
	true
)
define(
	['SHA1'],
	{ call: ([value]) => createHash('sha1').update(stringOf(value!)).digest('latin1'), min: 1, max: 1 },
	true
)
define(
	['SHA224'],
	{ call: ([value]) => createHash('sha224').update(stringOf(value!)).digest('latin1'), min: 1, max: 1 },
	true
)
define(
	['SHA256'],
	{ call: ([value]) => createHash('sha256').update(stringOf(value!)).digest('latin1'), min: 1, max: 1 },
	true
)
define(
	['SHA512'],
	{ call: ([value]) => createHash('sha512').update(stringOf(value!)).digest('latin1'), min: 1, max: 1 },
	true
)
define('isValidUTF8', { call: ([value]) => bool(!stringOf(value!).includes('�')), min: 1, max: 1 })
define('toValidUTF8', { call: ([value]) => stringOf(value!), min: 1, max: 1 })
define('format', {
	call: ([pattern, ...args]) =>
		stringOf(pattern!).replace(/\{(\d*)\}/g, (_, index: string, offset: number) =>
			stringOf(args[index === '' ? offset : Number(index)] ?? '')
		),
	min: 1,
})

// ---------------------------------------------------------------
// JSON strings

const jsonPath = (value: Value, keys: Value[]): unknown => {
	let current: unknown

	try {
		current = JSON.parse(stringOf(value))
	} catch {
		return undefined
	}

	for (const key of keys) {
		if (current === null || typeof current !== 'object') return undefined

		if (Array.isArray(current) && isNumeric(key)) {
			const index = integer(key)
			current = index > 0 ? current[index - 1] : current[current.length + index]
		} else {
			current = (current as Record<string, unknown>)[stringOf(key)]
		}
	}

	return current
}

define(['JSONExtractString', 'visitParamExtractString', 'simpleJSONExtractString'], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return typeof value === 'string' ? value : ''
	},
	min: 1,
})
define([
	'JSONExtractInt',
	'JSONExtractUInt',
	'visitParamExtractInt',
	'visitParamExtractUInt',
	'simpleJSONExtractInt',
	'simpleJSONExtractUInt',
], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return typeof value === 'number'
			? Math.trunc(value)
			: typeof value === 'string' && !Number.isNaN(Number(value))
				? Math.trunc(Number(value))
				: 0
	},
	min: 1,
})
define(['JSONExtractFloat', 'visitParamExtractFloat', 'simpleJSONExtractFloat'], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return typeof value === 'number' ? value : 0
	},
	min: 1,
})
define(['JSONExtractBool', 'visitParamExtractBool', 'simpleJSONExtractBool'], {
	call: ([json, ...keys]) => bool(jsonPath(json!, keys) === true),
	min: 1,
})
define(['JSONExtractRaw', 'visitParamExtractRaw', 'simpleJSONExtractRaw'], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return value === undefined ? '' : JSON.stringify(value)
	},
	min: 1,
})
define(['JSONHas', 'visitParamHas', 'simpleJSONHas'], {
	call: ([json, ...keys]) => bool(jsonPath(json!, keys) !== undefined),
	min: 1,
})
define('JSONLength', {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 0
	},
	min: 1,
})
define('JSONExtractKeys', {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []
	},
	min: 1,
})
define('JSONExtractArrayRaw', {
	call: ([json, ...keys]) => {
		const value = jsonPath(json!, keys)
		return Array.isArray(value) ? value.map(item => JSON.stringify(item)) : []
	},
	min: 1,
})
define('isValidJSON', {
	call: ([json]) => {
		try {
			JSON.parse(stringOf(json!))
			return 1
		} catch {
			return 0
		}
	},
	min: 1,
	max: 1,
})
define('toJSONString', {
	call: ([value]) => JSON.stringify(value instanceof Map ? Object.fromEntries(value) : value),
	min: 1,
	max: 1,
})

// ---------------------------------------------------------------
// arrays

define('array', { call: args => args, handlesNull: true })

export const arrayElement = (container: Value, index: Value): Value => {
	if (container instanceof Map) {
		for (const [key, value] of container) {
			if (valuesEqual(key, index)) return value
		}

		const sample = container.values().next().value
		return sample === undefined ? '' : emptyLike(sample)
	}

	if (
		container !== null &&
		typeof container === 'object' &&
		!Array.isArray(container) &&
		!(container instanceof TupleValue) &&
		!(container instanceof DateTimeValue) &&
		!(container instanceof DateValue) &&
		!(container instanceof IntervalValue)
	) {
		return ((container as Record<string, unknown>)[stringOf(index)] as Value) ?? null
	}

	const array = asArray(container, 'arrayElement')
	const i = integer(index)
	const item = i > 0 ? array[i - 1] : i < 0 ? array[array.length + i] : undefined

	if (item === undefined) {
		return array.length > 0 ? emptyLike(array[0]!) : ''
	}

	return item
}

// The default of a value's type, for out of range elements.
const emptyLike = (value: Value): Value => {
	if (typeof value === 'string') return ''
	if (typeof value === 'number' || typeof value === 'bigint') return 0
	if (typeof value === 'boolean') return false
	if (Array.isArray(value)) return []
	if (value instanceof DateTimeValue) return new DateTimeValue(0, value.scale, value.timeZone)
	if (value instanceof DateValue) return new DateValue(0)
	if (value === null) return null

	return null
}

define('arrayElement', { call: ([container, index]) => arrayElement(container!, index!), min: 2, max: 2 })
define('arrayElementOrNull', {
	call: ([container, index]) => {
		const array = asArray(container!, 'arrayElementOrNull')
		const i = integer(index!)
		return (i > 0 ? array[i - 1] : array[array.length + i]) ?? null
	},
	min: 2,
	max: 2,
})

define('tupleElement', {
	call: ([tuple, index, fallback]) => {
		if (tuple instanceof TupleValue) {
			if (typeof index === 'string') {
				const position = tuple.names?.indexOf(index) ?? -1
				if (position === -1) {
					if (fallback !== undefined) return fallback
					throw badArguments(`Tuple doesn't have element with name '${index}'`)
				}
				return tuple.items[position]!
			}

			const item = tuple.items[integer(index!) - 1]
			if (item === undefined) {
				if (fallback !== undefined) return fallback
				throw badArguments(`Index for tuple element is out of range`)
			}
			return item
		}

		if (Array.isArray(tuple)) return tuple[integer(index!) - 1] ?? null

		return arrayElement(tuple!, index!)
	},
	handlesNull: true,
	min: 2,
	max: 3,
})

define('tuple', { call: args => new TupleValue(args), handlesNull: true })

define('has', {
	call: ([array, value], ctx) => {
		if (array === null) return 0
		return bool(
			asArray(array!, 'has').some(item =>
				item === null
					? value === null
					: value !== null && compareValues(...coerceForComparison(item, value!, ctx)) === 0
			)
		)
	},
	handlesNull: true,
	min: 2,
	max: 2,
})

define('hasAny', {
	call: ([a, b]) =>
		bool(asArray(b!, 'hasAny').some(item => asArray(a!, 'hasAny').some(other => valuesEqual(item, other)))),
	min: 2,
	max: 2,
})
define('hasAll', {
	call: ([a, b]) =>
		bool(asArray(b!, 'hasAll').every(item => asArray(a!, 'hasAll').some(other => valuesEqual(item, other)))),
	min: 2,
	max: 2,
})
define('hasSubstr', {
	call: ([a, b]) => {
		const x = asArray(a!, 'hasSubstr')
		const y = asArray(b!, 'hasSubstr')
		if (y.length === 0) return 1
		for (let i = 0; i + y.length <= x.length; i++) if (y.every((item, j) => valuesEqual(item, x[i + j]!))) return 1
		return 0
	},
	min: 2,
	max: 2,
})
define('indexOf', {
	call: ([array, value]) => asArray(array!, 'indexOf').findIndex(item => valuesEqual(item, value!)) + 1,
	handlesNull: true,
	min: 2,
	max: 2,
})
define('countEqual', {
	call: ([array, value]) => asArray(array!, 'countEqual').filter(item => valuesEqual(item, value!)).length,
	handlesNull: true,
	min: 2,
	max: 2,
})
define('arrayConcat', { call: args => args.flatMap(arg => asArray(arg, 'arrayConcat')), min: 1 })
define('arraySlice', {
	call: ([array, offset, length]) => {
		const items = asArray(array!, 'arraySlice')
		const o = integer(offset!)
		const start = o > 0 ? o - 1 : o < 0 ? Math.max(items.length + o, 0) : 0
		if (o === 0) return []
		const end =
			length === undefined || length === null
				? items.length
				: integer(length) < 0
					? items.length + integer(length)
					: start + integer(length)
		return items.slice(start, end)
	},
	handlesNull: true,
	min: 2,
	max: 3,
})
define('arrayReverse', { call: ([array]) => [...asArray(array!, 'arrayReverse')].reverse(), min: 1, max: 1 })
define('arrayDistinct', {
	call: ([array]) => {
		const seen = new Set<string>()
		return asArray(array!, 'arrayDistinct').filter(item => {
			const key = valueKey(item)
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})
	},
	min: 1,
	max: 1,
})
define('arrayUniq', {
	call: args => {
		const seen = new Set<string>()
		const arrays = args.map(arg => asArray(arg, 'arrayUniq'))
		for (let i = 0; i < (arrays[0]?.length ?? 0); i++) seen.add(arrays.map(array => valueKey(array[i]!)).join('|'))
		return seen.size
	},
	min: 1,
})
define('arrayCompact', {
	call: ([array]) =>
		asArray(array!, 'arrayCompact').filter(
			(item, index, items) => index === 0 || !valuesEqual(item, items[index - 1]!)
		),
	min: 1,
	max: 1,
})
define('arrayEnumerate', {
	call: ([array]) => asArray(array!, 'arrayEnumerate').map((_, index) => index + 1),
	min: 1,
	max: 1,
})
define('arrayEnumerateUniq', {
	call: ([array]) => {
		const counts = new Map<string, number>()
		return asArray(array!, 'arrayEnumerateUniq').map(item => {
			const key = valueKey(item)
			const count = (counts.get(key) ?? 0) + 1
			counts.set(key, count)
			return count
		})
	},
	min: 1,
})
define('arrayPushBack', {
	call: ([array, value]) => [...asArray(array!, 'arrayPushBack'), value!],
	handlesNull: true,
	min: 2,
	max: 2,
})
define('arrayPushFront', {
	call: ([array, value]) => [value!, ...asArray(array!, 'arrayPushFront')],
	handlesNull: true,
	min: 2,
	max: 2,
})
define('arrayPopBack', { call: ([array]) => asArray(array!, 'arrayPopBack').slice(0, -1), min: 1, max: 1 })
define('arrayPopFront', { call: ([array]) => asArray(array!, 'arrayPopFront').slice(1), min: 1, max: 1 })
define('arrayIntersect', {
	call: args => {
		const [first = [], ...rest] = args.map(arg => asArray(arg, 'arrayIntersect'))
		const seen = new Set<string>()
		return first.filter(item => {
			const key = valueKey(item)
			if (seen.has(key)) return false
			seen.add(key)
			return rest.every(array => array.some(other => valuesEqual(item, other)))
		})
	},
	min: 1,
})
define(['arrayFlatten', 'flatten'], {
	call: ([array]) => {
		const flat = (items: Value[]): Value[] => items.flatMap(item => (Array.isArray(item) ? flat(item) : [item]))
		return flat(asArray(array!, 'arrayFlatten'))
	},
	min: 1,
	max: 1,
})
define('arrayZip', {
	call: args => {
		const arrays = args.map(arg => asArray(arg, 'arrayZip'))
		if (new Set(arrays.map(array => array.length)).size > 1)
			throw badArguments('The argument 1 and argument 2 of function arrayZip have different array sizes')
		return (arrays[0] ?? []).map((_, index) => new TupleValue(arrays.map(array => array[index]!)))
	},
	min: 1,
})
define('arraySum', {
	call: ([array]) =>
		asArray(array!, 'arraySum').reduce<Value>(
			(sum, item) =>
				arithmetic(
					sum,
					item ?? 0,
					(x, y) => x + y,
					(x, y) => x + y
				),
			0
		),
	min: 1,
	max: 1,
})
define('arrayAvg', {
	call: ([array]) => {
		const items = asArray(array!, 'arrayAvg')
		return items.length === 0 ? NaN : items.reduce<number>((sum, item) => sum + toNumber(item), 0) / items.length
	},
	min: 1,
	max: 1,
})
define('arrayProduct', {
	call: ([array]) => asArray(array!, 'arrayProduct').reduce<number>((product, item) => product * toNumber(item), 1),
	min: 1,
	max: 1,
})
define('arrayMin', {
	call: ([array]) => {
		const items = asArray(array!, 'arrayMin')
		return items.length === 0 ? 0 : items.reduce((best, item) => (compareValues(item, best) < 0 ? item : best))
	},
	min: 1,
	max: 1,
})
define('arrayMax', {
	call: ([array]) => {
		const items = asArray(array!, 'arrayMax')
		return items.length === 0 ? 0 : items.reduce((best, item) => (compareValues(item, best) > 0 ? item : best))
	},
	min: 1,
	max: 1,
})
define('arraySort', { call: ([array]) => [...asArray(array!, 'arraySort')].sort(sortWithNullsLast), min: 1 })
define('arrayReverseSort', {
	call: ([array]) =>
		[...asArray(array!, 'arrayReverseSort')].sort((a, b) =>
			a === null ? 1 : b === null ? -1 : compareValues(b, a)
		),
	min: 1,
})
define('arrayResize', {
	call: ([array, size, extend]) => {
		const items = asArray(array!, 'arrayResize')
		const n = integer(size!)
		if (n <= items.length) return items.slice(0, n)
		return [
			...items,
			...Array.from(
				{ length: n - items.length },
				() => extend ?? (items[0] !== undefined ? emptyLike(items[0]) : 0)
			),
		]
	},
	handlesNull: true,
	min: 2,
	max: 3,
})
define('emptyArrayString', { call: () => [], min: 0, max: 0 })
define([
	'emptyArrayUInt8',
	'emptyArrayUInt16',
	'emptyArrayUInt32',
	'emptyArrayUInt64',
	'emptyArrayInt8',
	'emptyArrayInt16',
	'emptyArrayInt32',
	'emptyArrayInt64',
	'emptyArrayFloat32',
	'emptyArrayFloat64',
	'emptyArrayDate',
	'emptyArrayDateTime',
], { call: () => [], min: 0, max: 0 })

define('range', {
	call: args => {
		const [start, end, step] =
			args.length === 1
				? [0, integer(args[0]!), 1]
				: [integer(args[0]!), integer(args[1]!), args[2] === undefined ? 1 : integer(args[2])]
		if (step === 0) throw badArguments('A call to function range would produce an infinite array')
		const items: number[] = []
		for (let i = start; step > 0 ? i < end : i > end; i += step) {
			items.push(i)
			if (items.length > 100_000_000)
				throw badArguments('A call to function range would produce too large an array')
		}
		return items
	},
	min: 1,
	max: 3,
})

export const sortWithNullsLast = (a: Value, b: Value) =>
	a === null ? (b === null ? 0 : 1) : b === null ? -1 : compareValues(a, b)

// ---------------------------------------------------------------
// maps

define('map', {
	call: args => {
		const map = new Map<Value, Value>()
		for (let i = 0; i + 1 < args.length; i += 2) map.set(args[i]!, args[i + 1]!)
		return map
	},
	handlesNull: true,
})
define('mapFromArrays', {
	call: ([keys, values]) =>
		new Map(asArray(keys!, 'mapFromArrays').map((key, index) => [key, asArray(values!, 'mapFromArrays')[index]!])),
	min: 2,
	max: 2,
})
define('mapKeys', { call: ([map]) => [...(map as Map<Value, Value>).keys()], min: 1, max: 1 })
define('mapValues', { call: ([map]) => [...(map as Map<Value, Value>).values()], min: 1, max: 1 })
define('mapContains', {
	call: ([map, key]) => bool([...(map as Map<Value, Value>).keys()].some(item => valuesEqual(item, key!))),
	min: 2,
	max: 2,
})

// ---------------------------------------------------------------
// misc

define(
	['currentDatabase', 'database', 'DATABASE', 'schema', 'current_database'],
	{ call: (_, ctx) => ctx.database, min: 0, max: 0 },
	true
)
define(['currentUser', 'user', 'current_user'], { call: () => 'default', min: 0, max: 0 }, true)
define(['version', 'VERSION'], { call: () => '26.8.33.10', min: 0, max: 0 }, true)
define(['hostName', 'hostname'], { call: () => 'localhost', min: 0, max: 0 })
define(['uptime'], { call: () => Math.floor(process.uptime()), min: 0, max: 0 })
define(['generateUUIDv4', 'UUIDv4'], { call: () => randomUUID(), min: 0, max: 1 })
define(['rand', 'rand32'], { call: () => Math.floor(Math.random() * 2 ** 32), min: 0, max: 1 }, true)
define(['rand64'], {
	call: () =>
		normalizeNumber(
			BigInt(Math.floor(Math.random() * 2 ** 32)) * 2n ** 32n + BigInt(Math.floor(Math.random() * 2 ** 32))
		),
	min: 0,
	max: 1,
})
define(['randCanonical'], { call: () => Math.random(), min: 0, max: 1 })
define('sleep', { call: () => 0, min: 1, max: 1 })
define('sleepEachRow', { call: () => 0, min: 1, max: 1 })
define('getSetting', { call: ([name], ctx) => (ctx.settings[stringOf(name!)] as Value) ?? null, min: 1, max: 1 })
define('toTypeName', { call: () => 'Unknown', handlesNull: true, min: 1, max: 1 })
define('defaultValueOfArgumentType', { call: ([value]) => emptyLike(value!), handlesNull: true, min: 1, max: 1 })
define('bar', {
	call: ([value, min, max, width]) => {
		const w = width === undefined ? 80 : toNumber(width)
		const ratio = (toNumber(value!) - toNumber(min!)) / (toNumber(max!) - toNumber(min!))
		return '█'.repeat(Math.max(0, Math.round(ratio * w)))
	},
	min: 3,
	max: 4,
})
define('formatReadableSize', {
	call: ([value]) => readable(toNumber(value!), 1024, ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']),
	min: 1,
	max: 1,
})
define('formatReadableDecimalSize', {
	call: ([value]) => readable(toNumber(value!), 1000, ['B', 'KB', 'MB', 'GB', 'TB', 'PB']),
	min: 1,
	max: 1,
})
define('formatReadableQuantity', {
	call: ([value]) =>
		readable(toNumber(value!), 1000, ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion']),
	min: 1,
	max: 1,
})

const readable = (value: number, base: number, units: string[]) => {
	let index = 0
	let current = value
	while (Math.abs(current) >= base && index < units.length - 1) {
		current /= base
		index++
	}
	return `${current.toFixed(2)}${units[index]!.startsWith(' ') || units[index] === '' ? '' : ' '}${units[index]}`
}

define('IPv4NumToString', {
	call: ([value]) => {
		const n = integer(value!) >>> 0
		return [24, 16, 8, 0].map(shift => (n >>> shift) & 255).join('.')
	},
	min: 1,
	max: 1,
})
define('IPv4StringToNum', {
	call: ([value]) =>
		stringOf(value!)
			.split('.')
			.reduce((n, part) => n * 256 + Number(part), 0),
	min: 1,
	max: 1,
})
define('isIPv4String', {
	call: ([value]) =>
		bool(
			/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(stringOf(value!)) &&
				stringOf(value!)
					.split('.')
					.every(part => Number(part) <= 255)
		),
	min: 1,
	max: 1,
})
define('isIPv6String', { call: ([value]) => bool(stringOf(value!).includes(':')), min: 1, max: 1 })

define('isIPAddressInRange', {
	call: ([address, cidr]) => {
		const [network, bits] = stringOf(cidr!).split('/')
		const toNum = (ip: string) => ip.split('.').reduce((n, part) => n * 256 + Number(part), 0)
		if (!stringOf(address!).includes('.') || !network?.includes('.')) return 0
		const mask = bits === undefined ? 32 : Number(bits)
		const shift = 32 - mask
		return bool(Math.floor(toNum(stringOf(address!)) / 2 ** shift) === Math.floor(toNum(network) / 2 ** shift))
	},
	min: 2,
	max: 2,
})

define('IPv4CIDRToRange', {
	call: ([address, bits]) => {
		const n = stringOf(address!)
			.split('.')
			.reduce((total, part) => total * 256 + Number(part), 0)
		const size = 2 ** (32 - integer(bits!))
		const start = Math.floor(n / size) * size
		const text = (value: number) => [24, 16, 8, 0].map(shift => Math.floor(value / 2 ** shift) % 256).join('.')
		return new TupleValue([text(start), text(start + size - 1)])
	},
	min: 2,
	max: 2,
})

define('toIPv4', { call: ([value]) => stringOf(value!), min: 1, max: 1 })
define('toIPv6', { call: ([value]) => stringOf(value!), min: 1, max: 1 })

define('domain', {
	call: ([url]) => {
		try {
			return new URL(stringOf(url!)).hostname
		} catch {
			return ''
		}
	},
	min: 1,
	max: 1,
})
define('domainWithoutWWW', {
	call: ([url]) => {
		try {
			return new URL(stringOf(url!)).hostname.replace(/^www\./, '')
		} catch {
			return ''
		}
	},
	min: 1,
	max: 1,
})
define('protocol', {
	call: ([url]) => {
		try {
			return new URL(stringOf(url!)).protocol.replace(/:$/, '')
		} catch {
			return ''
		}
	},
	min: 1,
	max: 1,
})
define('path', {
	call: ([url]) => {
		try {
			return new URL(stringOf(url!)).pathname
		} catch {
			return ''
		}
	},
	min: 1,
	max: 1,
})
define('queryString', {
	call: ([url]) => {
		try {
			return new URL(stringOf(url!)).search.slice(1)
		} catch {
			return ''
		}
	},
	min: 1,
	max: 1,
})
define('cutQueryString', { call: ([url]) => stringOf(url!).replace(/\?[^#]*/, ''), min: 1, max: 1 })
define('extractURLParameter', {
	call: ([url, name]) => {
		try {
			return new URL(stringOf(url!)).searchParams.get(stringOf(name!)) ?? ''
		} catch {
			return ''
		}
	},
	min: 2,
	max: 2,
})
define(['decodeURLComponent'], {
	call: ([value]) => {
		try {
			return decodeURIComponent(stringOf(value!))
		} catch {
			return stringOf(value!)
		}
	},
	min: 1,
	max: 1,
})
define(['encodeURLComponent'], { call: ([value]) => encodeURIComponent(stringOf(value!)), min: 1, max: 1 })

// Values that don't fit the type a function promises.
export const checkArguments = (name: string, fn: ScalarFunction, count: number) => {
	if ((fn.min !== undefined && count < fn.min) || (fn.max !== undefined && count > fn.max)) {
		const expected =
			fn.min === fn.max ? `${fn.min}` : fn.max === undefined ? `at least ${fn.min}` : `${fn.min} to ${fn.max}`
		throw argumentCount(
			`Number of arguments for function ${name} doesn't match: passed ${count}, should be ${expected}`
		)
	}
}

export const textOf = textValue
export const dateTextOf = formatDateValue
export const formatValueForError = (value: Value) => stringOf(value)
export { cannotParseText, incorrectData, wrapInteger }
export type { DataType }
