import { z } from 'zod'
import { Duration } from '../../formation/property/duration.js'

export type DurationFormat = `${number} ${
	| 'second'
	| 'seconds'
	| 'minute'
	| 'minutes'
	| 'hour'
	| 'hours'
	| 'day'
	| 'days'}`

export function toDuration(duration: DurationFormat) {
	const [count, unit] = duration.split(' ')
	const countNum = parseInt(count)
	const unitLower = unit.toLowerCase()

	if (unitLower.startsWith('second')) {
		return Duration.seconds(countNum)
	} else if (unitLower.startsWith('minute')) {
		return Duration.minutes(countNum)
	} else if (unitLower.startsWith('hour')) {
		return Duration.hours(countNum)
	} else if (unitLower.startsWith('day')) {
		return Duration.days(countNum)
	}

	return Duration.days(0)
}

export const DurationSchema = z
	.string()
	.regex(/^[0-9]+ (seconds?|minutes?|hours?|days?)$/, 'Invalid duration')
	.transform<Duration>(v => toDuration(v as DurationFormat))

export const durationMin = (min: Duration) => {
	return (duration: Duration) => {
		return duration.toSeconds() >= min.toSeconds()
	}
}

export const durationMax = (max: Duration) => {
	return (duration: Duration) => {
		return duration.toSeconds() <= max.toSeconds()
	}
}
