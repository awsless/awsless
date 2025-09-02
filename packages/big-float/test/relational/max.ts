import { eq, max, Numeric, string } from '../../src'

describe('max', () => {
	const t = (values: Numeric[], expectation: Numeric) => {
		it(`max(${values.join(', ')}) = ${expectation}`, () => {
			const result = max(...values)

			expect(result.toString()).toBe(string(expectation))
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t([1], 1)
	t([1, 2, 3], 3)
	t([1, 10], 10)
	t([1, 1.1], 1.1)
	t([1, 0], 1)
	t([1, 0.1], 1)
	t([1, -1], 1)
	t([-1, -2], -1)
})
