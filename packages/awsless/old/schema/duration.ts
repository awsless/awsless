
import { z } from "zod";
import { Duration as CDKDuration } from 'aws-cdk-lib/core'

export type Duration = `${number} ${
	| 'second'
	| 'seconds'
	| 'minute'
	| 'minutes'
	| 'hour'
	| 'hours'
	| 'day'
	| 'days'
}`

export function toDuration(duration: Duration): CDKDuration {
	const [count, unit] = duration.split(' ')
	const countNum = parseInt(count)
	const unitLower = unit.toLowerCase()

	if (unitLower.startsWith('second')) {
		return CDKDuration.seconds(countNum)
	} else if (unitLower.startsWith('minute')) {
		return CDKDuration.minutes(countNum)
	} else if (unitLower.startsWith('hour')) {
		return CDKDuration.hours(countNum)
	} else if (unitLower.startsWith('day')) {
		return CDKDuration.days(countNum)
	}

	return CDKDuration.days(0)
}

export const DurationSchema = z.custom<Duration>((value) => {
	return z.string()
		.regex(/[0-9]+ (seconds?|minutes?|hours?|days?)/)
		// .refine<Duration>((duration): duration is Duration => {
		// 	const [ str ] = duration.split(' ')
		// 	const number = parseInt(str)
		// 	return number > 0
		// }, 'Duration must be greater then zero')
		.safeParse(value).success
}, 'Invalid duration').transform<CDKDuration>(toDuration)
