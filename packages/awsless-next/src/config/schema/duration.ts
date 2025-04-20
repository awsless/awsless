import { Duration, DurationFormat, parse } from '@awsless/duration'
import { z } from 'zod'

export const DurationSchema = z
	.string()
	.regex(/^[0-9]+ (seconds?|minutes?|hours?|days?|weeks?)$/, 'Invalid duration')
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
