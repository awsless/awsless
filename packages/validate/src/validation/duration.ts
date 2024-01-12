import { Duration } from '@awsless/duration'
import { ErrorMessage, custom } from 'valibot'

export function minDuration<T extends Duration>(min: Duration, error?: ErrorMessage) {
	return custom<T>(input => input.value >= min.value, error ?? 'Invalid duration')
}

export function maxDuration<T extends Duration>(max: Duration, error?: ErrorMessage) {
	return custom<T>(input => input.value <= max.value, error ?? 'Invalid duration')
}

// export function durationPrecision<T extends Duration>(
// 	precision: 'seconds' | 'minutes' | 'hours' | 'days',
// 	error?: ErrorMessage
// ) {
// 	return custom<T>(input => input.value <= max.value, error ?? 'Invalid duration')
// }
