import { testSchema } from '../_util'
import { bigfloat, parse, Input, Output } from '../../src'
import { BigFloat } from '@awsless/big-float'

testSchema('bigfloat', {
	valid: [0, -1, 1, '0', '1', '-1', new BigFloat(1), new BigFloat('1')],
	invalid: [null, undefined, true, false, NaN, '', 'a', [], {}, new Date(), new Set(), new Map()],
	validate: value => {
		const result = parse(bigfloat(), value)
		expect(result).toBeInstanceOf(BigFloat)
		expect(result.toString()).toBe(value.toString())
	},
})

it('bigfloat like', () => {
	const result = parse(bigfloat(), { exponent: -5, coefficient: 10n })
	expect(result.toString()).toStrictEqual('0.0001')
})

it('bigfloat types', () => {
	const schema = bigfloat()
	expectTypeOf<Output<typeof schema>>().toMatchTypeOf<BigFloat>()
	expectTypeOf<Input<typeof schema>>().toMatchTypeOf<
		| string
		| number
		| BigFloat
		| {
				exponent: number
				coefficient: bigint
		  }
	>()
})
