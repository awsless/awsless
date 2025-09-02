import { eq, min, Numeric, string } from '../../src'

describe('min', () => {
	const t = (values: Numeric[], expectation: Numeric) => {
		it(`min(${values.join(', ')}) = ${expectation}`, () => {
			const result = min(...values)

			expect(result.toString()).toBe(string(expectation))
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t([1], 1)
	t([1, 2, 3], 1)
	t([1, 10], 1)
	t([1, 1.1], 1)
	t([1, 0], 0)
	t([1, 0.1], 0.1)
	t([1, -1], -1)
	t([-1, -2], -2)
})
