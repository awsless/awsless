import { BigFloat, eq, floor, mul } from '@awsless/big-float'
import { safeNumberParse, safeNumberStringify } from '../src'

describe('Safe number JSON', () => {
	const ONE = new BigFloat(1)

	it('stringify', () => {
		const result = safeNumberStringify(ONE, {
			is: v => v instanceof BigFloat,
			stringify: v => v.toString(),
		})

		expect(result).toBe('1')
	})

	it('stringify with rounding', () => {
		const result = safeNumberStringify(floor(1.111111, 2), {
			is: v => v instanceof BigFloat,
			stringify: v => v.toString(),
		})

		expect(result).toBe('1.11')
	})

	it('parse', () => {
		const result = safeNumberParse('1', {
			parse: v => new BigFloat(v),
		})

		expect(result).toStrictEqual(ONE)
	})

	it('complex', () => {
		const complex = {
			value: mul(Number.MAX_SAFE_INTEGER, 9999.9999),
		}

		const json = safeNumberStringify(complex, {
			is: v => v instanceof BigFloat,
			stringify: v => v.toString(),
		})

		const result = safeNumberParse(json, {
			parse: v => new BigFloat(v),
		})

		expect(eq(result.value, complex.value)).toBeTruthy()
	})
})
