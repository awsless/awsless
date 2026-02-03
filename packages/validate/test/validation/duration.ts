import { days, Duration, hours, milliSeconds, minutes, seconds } from '@awsless/duration'
import { duration, maxDuration, minDuration, parse, pipe } from '../../src'
import { testSchema } from '../_util'

testSchema('min duration', {
	valid: [seconds(1), milliSeconds(1000), hours(1)],
	invalid: [milliSeconds(0), milliSeconds(1), milliSeconds(999)],
	validate: value => {
		const schema = pipe(duration(), minDuration(seconds(1)))
		const result = parse(schema, value)
		expect(result).toBeInstanceOf(Duration)
	},
})

testSchema('max duration', {
	valid: [milliSeconds(0), minutes(60), hours(1)],
	invalid: [minutes(61), hours(2), days(1)],
	validate: value => {
		const schema = pipe(duration(), maxDuration(hours(1)))
		const result = parse(schema, value)
		expect(result).toBeInstanceOf(Duration)
	},
})
