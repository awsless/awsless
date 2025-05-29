import { BigFloat, div } from '@awsless/big-float'

describe('bigfloat equal test', () => {
	const a = new BigFloat(2)
	const b = div(new BigFloat(4), 2)

	it('toBe', () => {
		expect(a).not.toBe(b)
	})

	it('toEqual', () => {
		expect(a).toEqual(b)
	})

	it('toStrictEqual', () => {
		expect({ deep: a }).toStrictEqual({ deep: b })
	})
})
