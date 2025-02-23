import { Duration, hours, milliSeconds, seconds } from '@awsless/duration'
import { duration, maxDuration, minDuration, parse } from '../../src'
import { testSchema } from '../_util'

testSchema('min duration', {
	valid: [seconds(1), '1000 milliseconds', '1 second', '1 hour'],
	invalid: [milliSeconds(1), '1 milliseconds', '999 milliseconds'],
	validate: value => {
		const result = parse(duration([minDuration(seconds(1))]), value)
		expect(result).toBeInstanceOf(Duration)
	},
})

testSchema('max duration', {
	valid: ['60 minutes', '1 hour'],
	invalid: ['61 minutes', '2 hours', '1 day'],
	validate: value => {
		const result = parse(duration([maxDuration(hours(1))]), value)
		expect(result).toBeInstanceOf(Duration)
	},
})
