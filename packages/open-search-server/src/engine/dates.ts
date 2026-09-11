import { illegalArgument, parsingError, unsupported } from '../errors'

const ISO_FORMATS = new Set(['strict_date_optional_time', 'date_optional_time', 'strict_date_time', 'date_time'])

export const DEFAULT_DATE_FORMAT = 'strict_date_optional_time||epoch_millis'

export type DateFormat = { iso: boolean; epochMillis: boolean; epochSecond: boolean }

export const parseDateFormat = (format: string | undefined): DateFormat => {
	const parts = (format ?? DEFAULT_DATE_FORMAT).split('||').map(p => p.trim())
	const result: DateFormat = { iso: false, epochMillis: false, epochSecond: false }

	for (const part of parts) {
		if (ISO_FORMATS.has(part)) result.iso = true
		else if (part === 'epoch_millis') result.epochMillis = true
		else if (part === 'epoch_second') result.epochSecond = true
		else throw unsupported(`the date format "${part}"`)
	}

	return result
}

const ISO_PATTERN =
	/^(\d{4})-(\d{2})(?:-(\d{2}))?(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/

// ISO 8601 with optional time, fraction and zone, as the strict_date_optional_time
// format accepts it. Dates without a zone are UTC.
export const parseIsoDate = (text: string): number | undefined => {
	const match = ISO_PATTERN.exec(text)
	if (!match) return undefined

	const [, year, month, day, hour, minute, second, fraction, zone] = match
	const millis = fraction ? Number(fraction.padEnd(3, '0').slice(0, 3)) : 0
	const time = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day ?? '1'),
		Number(hour ?? '0'),
		Number(minute ?? '0'),
		Number(second ?? '0'),
		millis
	)

	if (Number.isNaN(time)) return undefined
	if (!zone || zone === 'Z') return time

	const sign = zone.startsWith('-') ? -1 : 1
	const digits = zone.slice(1).replace(':', '')
	const offset = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || '0')

	return time - sign * offset * 60_000
}

export const isIsoDate = (text: string) => ISO_PATTERN.test(text) && parseIsoDate(text) !== undefined

export const parseDateValue = (value: unknown, format: DateFormat): number | undefined => {
	if (typeof value === 'number') {
		if (format.epochSecond && !format.epochMillis) return value * 1000
		return value
	}

	if (typeof value !== 'string') return undefined

	if (format.iso) {
		const time = parseIsoDate(value)
		if (time !== undefined) return time
	}

	if ((format.epochMillis || format.epochSecond) && /^-?\d+$/.test(value)) {
		const number = Number(value)
		return format.epochMillis ? number : number * 1000
	}

	return undefined
}

export const formatDate = (millis: number) => new Date(millis).toISOString()

type Unit = 'y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's'

const UNIT_ALIASES: Record<string, Unit> = { y: 'y', M: 'M', w: 'w', d: 'd', h: 'h', H: 'h', m: 'm', s: 's' }

const addUnit = (time: number, amount: number, unit: Unit): number => {
	const date = new Date(time)
	switch (unit) {
		case 'y':
			date.setUTCFullYear(date.getUTCFullYear() + amount)
			return date.getTime()
		case 'M':
			date.setUTCMonth(date.getUTCMonth() + amount)
			return date.getTime()
		case 'w':
			return time + amount * 7 * 86_400_000
		case 'd':
			return time + amount * 86_400_000
		case 'h':
			return time + amount * 3_600_000
		case 'm':
			return time + amount * 60_000
		case 's':
			return time + amount * 1000
	}
}

export const roundDownTo = (time: number, unit: Unit): number => {
	const date = new Date(time)
	switch (unit) {
		case 'y':
			return Date.UTC(date.getUTCFullYear(), 0, 1)
		case 'M':
			return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
		case 'w': {
			// Weeks start on Monday, as in OpenSearch.
			const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
			const weekday = (date.getUTCDay() + 6) % 7
			return day - weekday * 86_400_000
		}
		case 'd':
			return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
		case 'h':
			return time - (time % 3_600_000)
		case 'm':
			return time - (time % 60_000)
		case 's':
			return time - (time % 1000)
	}
}

const roundUpTo = (time: number, unit: Unit): number => addUnit(roundDownTo(time, unit), 1, unit) - 1

const MATH_PATTERN = /^([+-])(\d+)([yMwdhHms])|^\/([yMwdhHms])/

// Date math: `now-1d/d`, `2024-01-01||+1M`. Rounding goes up for the
// exclusive/upper side so `lte: now/d` means end of today.
export const parseDateMath = (text: string, format: DateFormat, roundUp: boolean, now: number): number => {
	let rest: string
	let time: number

	if (text.startsWith('now')) {
		time = now
		rest = text.slice(3)
	} else {
		const split = text.indexOf('||')
		const anchor = split === -1 ? text : text.slice(0, split)
		rest = split === -1 ? '' : text.slice(split + 2)
		const parsed = parseDateValue(anchor, format)
		if (parsed === undefined) {
			throw parsingError(`failed to parse date field [${text}] with format [${formatName(format)}]`)
		}
		time = parsed
	}

	while (rest.length > 0) {
		const match = MATH_PATTERN.exec(rest)
		if (!match) throw illegalArgument(`operator not supported for date math [${text}]`)
		rest = rest.slice(match[0].length)

		if (match[4]) {
			const unit = UNIT_ALIASES[match[4]]!
			time = roundUp ? roundUpTo(time, unit) : roundDownTo(time, unit)
		} else {
			const amount = Number(match[2]) * (match[1] === '-' ? -1 : 1)
			time = addUnit(time, amount, UNIT_ALIASES[match[3]!]!)
		}
	}

	return time
}

const formatName = (format: DateFormat) => {
	const parts: string[] = []
	if (format.iso) parts.push('strict_date_optional_time')
	if (format.epochMillis) parts.push('epoch_millis')
	if (format.epochSecond) parts.push('epoch_second')
	return parts.join('||')
}

export type Interval = { fixed?: number; calendar?: Unit | 'q' }

const FIXED_UNITS: Record<string, number> = {
	ms: 1,
	s: 1000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
}

const CALENDAR_UNITS: Record<string, Unit | 'q'> = {
	minute: 'm',
	'1m': 'm',
	hour: 'h',
	'1h': 'h',
	day: 'd',
	'1d': 'd',
	week: 'w',
	'1w': 'w',
	month: 'M',
	'1M': 'M',
	quarter: 'q',
	'1q': 'q',
	year: 'y',
	'1y': 'y',
}

export const parseFixedInterval = (text: string): number => {
	const match = /^(\d+)(ms|s|m|h|d)$/.exec(text)
	if (!match) throw illegalArgument(`failed to parse setting [fixed_interval] with value [${text}]`)
	return Number(match[1]) * FIXED_UNITS[match[2]!]!
}

export const parseCalendarInterval = (text: string): Unit | 'q' => {
	const unit = CALENDAR_UNITS[text]
	if (!unit) throw illegalArgument(`The supplied interval [${text}] could not be parsed as a calendar interval.`)
	return unit
}

export const roundToInterval = (time: number, interval: Interval): number => {
	if (interval.fixed !== undefined) {
		return Math.floor(time / interval.fixed) * interval.fixed
	}
	if (interval.calendar === 'q') {
		const date = new Date(time)
		return Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1)
	}
	return roundDownTo(time, interval.calendar!)
}

export const nextInterval = (time: number, interval: Interval): number => {
	if (interval.fixed !== undefined) return time + interval.fixed
	if (interval.calendar === 'q') return addUnit(time, 3, 'M')
	return addUnit(time, 1, interval.calendar!)
}
