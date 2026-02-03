import { days, Duration, hours, milliSeconds, minutes, seconds, weeks, years } from '@awsless/duration'
import { duration, InferInput, InferOutput, parse } from '../../src'
import { testSchema } from '../_util'

testSchema('duration', {
	valid: [
		//
		milliSeconds(1),
		seconds(1),
		minutes(1),
		hours(1),
		days(1),
		weeks(1),
		days(999),
		years(1),
	],
	invalid: [
		//
		'day',
		'a day',
		'1 secon',
		undefined,
		null,
		'0',
	],
	validate: value => {
		const result = parse(duration(), value)
		expect(result).toBeInstanceOf(Duration)
	},
})

it('duration types', () => {
	const schema = duration()
	expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<Duration>()
	expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<Duration>()
})
