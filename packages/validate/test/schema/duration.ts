import { days, Duration, DurationFormat, hours, milliSeconds, minutes, seconds, weeks } from '@awsless/duration'
import { duration, Input, Output, parse } from '../../src'
import { testSchema } from '../_util'

testSchema('duration', {
	valid: [
		milliSeconds(1),
		seconds(1),
		minutes(1),
		hours(1),
		days(1),
		weeks(1),
		days(999),

		// '1 millisecond',
		// '1 milliseconds',
		// '1 second',
		// '1 seconds',
		// '1 minute',
		// '1 minutes',
		// '1 hour',
		// '1 hours',
		// '1 day',
		// '1 days',
		// '1 week',
		// '1 weeks',
		// '999 days',
	],
	invalid: ['day', 'a day', '1 secon', undefined, null, '0'],
	validate: value => {
		const result = parse(duration(), value)
		expect(result).toBeInstanceOf(Duration)
	},
})

it('duration types', () => {
	const schema = duration()
	expectTypeOf<Output<typeof schema>>().toEqualTypeOf<Duration>()
	expectTypeOf<Input<typeof schema>>().toEqualTypeOf<Duration | DurationFormat>()
})

// it('duration types', () => {
// 	const schema = object({
// 		value: duration(),
// 	})

// 	const result = parse(schema, { value: '1 minute' })
// 	console.log(result)
// })
