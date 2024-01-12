import { testSchema } from '../_util'
import { duration, parse, Input, Output } from '../../src'
import { Duration, DurationFormat } from '@awsless/duration'

testSchema('duration', {
	valid: [
		'1 millisecond',
		'1 milliseconds',
		'1 second',
		'1 seconds',
		'1 minute',
		'1 minutes',
		'1 hour',
		'1 hours',
		'1 day',
		'1 days',
		'999 days',
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
	expectTypeOf<Input<typeof schema>>().toEqualTypeOf<DurationFormat>()
})

// it('duration types', () => {
// 	const schema = object({
// 		value: duration(),
// 	})

// 	const result = parse(schema, { value: '1 minute' })
// 	console.log(result)
// })
