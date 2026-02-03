import { Duration } from '@awsless/duration'
import { CheckIssue, ErrorMessage, check } from 'valibot'

export function minDuration(min: Duration, message: ErrorMessage<CheckIssue<Duration>> = 'Invalid duration') {
	return check<Duration, ErrorMessage<CheckIssue<Duration>>>(input => input.value >= min.value, message)
}

export function maxDuration(max: Duration, message: ErrorMessage<CheckIssue<Duration>> = 'Invalid duration') {
	return check<Duration, ErrorMessage<CheckIssue<Duration>>>(input => input.value <= max.value, message)
}

// export function durationPrecision<T extends Duration>(
// 	precision: 'seconds' | 'minutes' | 'hours' | 'days',
// 	error?: ErrorMessage
// ) {
// 	return custom<T>(input => input.value <= max.value, error ?? 'Invalid duration')
// }
