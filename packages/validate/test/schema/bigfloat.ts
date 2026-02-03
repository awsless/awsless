import { BigFloat } from '@awsless/big-float'
import { bigfloat, InferInput, InferOutput, parse } from '../../src'
import { testSchema } from '../_util'

testSchema('bigfloat', {
	valid: [0, -1, 1, '0', '1', '-1', new BigFloat(1), new BigFloat('1')],
	invalid: [null, undefined, true, false, NaN, '', 'a', [], {}, new Date(), new Set(), new Map()],
	validate: value => {
		const result = parse(bigfloat(), value)
		expect(result).toBeInstanceOf(BigFloat)
		expect(result.toString()).toBe(value.toString())
	},
})

it('bigfloat types', () => {
	const schema = bigfloat()
	expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<BigFloat | string | bigint | number>()
	expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<BigFloat>()
})
