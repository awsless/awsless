import { testSchema } from '../_util'
import { Input, Output, date, parse } from '../../src'

const schema = date()

testSchema('date', {
	valid: ['1-1-2000', '01-01-2000', new Date()],
	invalid: [null, undefined, true, false, NaN, '', 'a', 'today', [], {}, new Set(), new Map()],
	validate: value => {
		const result = parse(schema, value)
		expect(result).toBeInstanceOf(Date)
	},
})

it('date types', () => {
	expectTypeOf<Input<typeof schema>>().toEqualTypeOf<string | Date>()
	expectTypeOf<Output<typeof schema>>().toEqualTypeOf<Date>()
})
