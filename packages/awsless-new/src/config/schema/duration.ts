import { z } from 'zod'
import { Duration, DurationFormat, parse } from '@awsless/duration'

export const DurationSchema = z
	.string()
	.regex(/^[0-9]+ (seconds?|minutes?|hours?|days?)$/, 'Invalid duration')
	.transform<Duration>(v => parse(v as DurationFormat))

export const durationMin = (min: Duration) => {
	return (duration: Duration) => {
		return duration.value >= min.value
	}
}

export const durationMax = (max: Duration) => {
	return (duration: Duration) => {
		return duration.value <= max.value
	}
}
