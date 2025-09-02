import { clamp, eq, Numeric, string } from '../../src'

describe('clamp', () => {
	const t = (n: Numeric, min: Numeric, max: Numeric, expectation: Numeric) => {
		it(`clamp(${n}, ${min}, ${max}) = ${expectation}`, () => {
			const result = clamp(n, min, max)

			expect(result.toString()).toBe(string(expectation))
			expect(eq(result, expectation)).toBe(true)
		})
	}

	const e = (n: Numeric, min: Numeric, max: Numeric) => {
		it(`clamp(${n}, ${min}, ${max}) should throw`, () => {
			expect(() => clamp(n, min, max)).toThrow(TypeError)
		})
	}

	t(1, 1, 1, 1)
	t(1, 2, 3, 2)
	t(5, 1, 10, 5)
	t(20, 1, 10, 10)
	t(1, -1, 1, 1)

	e(1, 1, 0)
	e(1, 0.1, 0)
	e(1, 0.1, -0.1)
})
