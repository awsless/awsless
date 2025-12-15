import { days, hours, milliSeconds, minutes, seconds, weeks, years } from './duration'

export type DurationUnit =
	| 'millisecond'
	| 'milliseconds'
	| 'second'
	| 'seconds'
	| 'minute'
	| 'minutes'
	| 'hour'
	| 'hours'
	| 'day'
	| 'days'
	| 'week'
	| 'weeks'
	| 'year'
	| 'years'

export type DurationFormat = `${number} ${DurationUnit}`

export const parse = (value: DurationFormat) => {
	const [count, unit] = value.split(/\s+/)

	if (typeof count === 'string' && typeof unit === 'string') {
		const number = BigInt(count)

		if (unit.startsWith('millisecond')) {
			return milliSeconds(number)
		} else if (unit.startsWith('second')) {
			return seconds(number)
		} else if (unit.startsWith('minute')) {
			return minutes(number)
		} else if (unit.startsWith('hour')) {
			return hours(number)
		} else if (unit.startsWith('day')) {
			return days(number)
		} else if (unit.startsWith('week')) {
			return weeks(number)
		} else if (unit.startsWith('year')) {
			return years(number)
		}
	}

	throw new SyntaxError(`Invalid duration: ${value}`)
}
