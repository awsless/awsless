import { bigint, Input, Output, parse } from '../../src'
import { testSchema } from '../_util'

testSchema('bigint', {
	valid: ['0', '1', '-1', BigInt(1), BigInt(-1), BigInt('1')],
	invalid: ['0.01', 0, -1, 1, null, undefined, NaN, '', 'a', [], {}, new Date()],
	validate: value => {
		const result = parse(bigint(), value)
		expect(result).toBeTypeOf('bigint')
		expect(result.toString()).toBe(value.toString())
	},
})

it('bigint like', () => {
	const result = parse(bigint(), '10')
	expect(result.toString()).toStrictEqual('10')
})

it('bigint types', () => {
	const schema = bigint()
	expectTypeOf<Output<typeof schema>>().toEqualTypeOf<bigint>()
	expectTypeOf<Input<typeof schema>>().toEqualTypeOf<string | bigint>()
})
