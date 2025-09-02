import { BigFloat, eq, Numeric, string } from '../../src'

describe('parse / stringify', () => {
	const t = (n: Numeric, expectation: string) => {
		it(`new BigFloat(${n}) = ${expectation}`, () => {
			const result = new BigFloat(n)
			expect(result.toString()).toBe(expectation)
			expect(string(result)).toBe(expectation)
			expect(eq(result, expectation)).toBe(true)
		})
	}

	const e = (n: Numeric) => {
		it(`new BigFloat(${n}) should throw`, () => {
			expect(() => new BigFloat(n)).toThrow(TypeError)
		})
	}

	// Throw for octal, hex, and binary values
	e('0o1')
	e('0O1')
	e('0x1')
	e('0X1')
	e('0b1')
	e('0B1')

	t(0, '0')
	t(0n, '0')
	t('0', '0')
	t(new BigFloat(0), '0')
	t(new BigFloat(0n), '0')
	t(new BigFloat('0'), '0')

	t(1, '1')
	t(1n, '1')
	t('1', '1')
	t(new BigFloat(1), '1')
	t(new BigFloat(1n), '1')
	t(new BigFloat('1'), '1')

	t(-1, '-1')
	t(-1n, '-1')
	t('-1', '-1')
	t(new BigFloat(-1), '-1')
	t(new BigFloat(-1n), '-1')
	t(new BigFloat('-1'), '-1')
})
