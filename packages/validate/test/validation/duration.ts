import { testSchema } from '../_util'
import { duration, parse, minDuration, maxDuration } from '../../src'
import { Duration, hours, seconds } from '@awsless/duration'

testSchema('min duration', {
	valid: ['1000 milliseconds', '1 second', '1 hour'],
	invalid: ['1 milliseconds', '999 milliseconds'],
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
