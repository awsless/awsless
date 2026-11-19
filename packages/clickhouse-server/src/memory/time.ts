// Calendar math in a named time zone on top of Intl, which knows every
// zone's offsets & daylight saving rules.

export type Parts = {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
	// 1 is Monday, 7 is Sunday, like toDayOfWeek.
	weekday: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

const formatter = (timeZone: string) => {
	let format = formatters.get(timeZone)

	if (!format) {
		format = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			weekday: 'short',
		})

		formatters.set(timeZone, format)
	}

	return format
}

export const isTimeZone = (timeZone: string) => {
	try {
		formatter(timeZone)
		return true
	} catch {
		return false
	}
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

const utcParts = (ms: number): Parts => {
	const date = new Date(ms)

	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		hour: date.getUTCHours(),
		minute: date.getUTCMinutes(),
		second: date.getUTCSeconds(),
		weekday: ((date.getUTCDay() + 6) % 7) + 1,
	}
}

// Offsets only change on the quarter hour, so one Intl lookup per zone &
// quarter hour serves every moment in it - Intl is slow per call.
const QUARTER = 900_000
const offsets = new Map<string, Map<number, number>>()

const cachedOffset = (ms: number, timeZone: string) => {
	let zone = offsets.get(timeZone)

	if (!zone) {
		zone = new Map()
		offsets.set(timeZone, zone)
	}

	const bucket = Math.floor(ms / QUARTER)
	let offset = zone.get(bucket)

	if (offset === undefined) {
		const start = bucket * QUARTER
		const p = intlParts(start, timeZone)
		offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - start

		if (zone.size > 100_000) zone.clear()
		zone.set(bucket, offset)
	}

	return offset
}

export const partsIn = (ms: number, timeZone: string): Parts => {
	if (timeZone === 'UTC') {
		return utcParts(ms)
	}

	return utcParts(Math.floor(ms / 1000) * 1000 + cachedOffset(ms, timeZone))
}

const intlParts = (ms: number, timeZone: string): Parts => {
	if (timeZone === 'UTC') {
		const date = new Date(ms)

		return {
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: date.getUTCHours(),
			minute: date.getUTCMinutes(),
			second: date.getUTCSeconds(),
			weekday: ((date.getUTCDay() + 6) % 7) + 1,
		}
	}

	const parts: Record<string, string> = {}

	for (const part of formatter(timeZone).formatToParts(new Date(Math.floor(ms / 1000) * 1000))) {
		parts[part.type] = part.value
	}

	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second),
		weekday: WEEKDAYS[parts.weekday!]!,
	}
}

// The offset from UTC at a moment, in milliseconds.
export const offsetAt = (ms: number, timeZone: string) => {
	return timeZone === 'UTC' ? 0 : cachedOffset(ms, timeZone)
}

// The moment a wall clock time happens in the zone. A time skipped by a
// daylight saving jump moves forward, like ClickHouse does.
export const fromParts = (
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
	second = 0,
	timeZone = 'UTC'
) => {
	const wall = Date.UTC(year, month - 1, day, hour, minute, second)

	if (timeZone === 'UTC') {
		return wall
	}

	let guess = wall - offsetAt(wall, timeZone)
	guess = wall - offsetAt(guess, timeZone)

	return guess
}

// Days since 1970-01-01 of the calendar day a moment falls on.
export const dayNumberIn = (ms: number, timeZone: string) => {
	const p = partsIn(ms, timeZone)
	return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000)
}

export const dayToParts = (days: number) => {
	const date = new Date(days * 86_400_000)

	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		weekday: ((date.getUTCDay() + 6) % 7) + 1,
	}
}

export const partsToDay = (year: number, month: number, day: number) => {
	return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

export const formatDay = (days: number) => {
	const p = dayToParts(days)
	return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`
}

export const formatDateTime = (ms: number, timeZone: string, scale: number) => {
	const p = partsIn(ms, timeZone)
	const base = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`

	return scale > 0 ? `${base}.${fraction(ms, scale)}` : base
}

export const formatIso = (ms: number, scale: number) => {
	const p = partsIn(ms, 'UTC')
	const base = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`

	return scale > 0 ? `${base}.${fraction(ms, scale)}Z` : `${base}Z`
}

// The digits after the second, from the fractional milliseconds kept.
export const fraction = (ms: number, scale: number) => {
	const subsecond = ms - Math.floor(ms / 1000) * 1000
	const digits = Math.round(subsecond * 10 ** (scale - 3))

	return String(Math.min(digits, 10 ** scale - 1)).padStart(scale, '0')
}
