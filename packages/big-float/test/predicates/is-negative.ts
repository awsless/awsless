import { isNegative, Numeric } from '../../src'

describe('isNegative', () => {
	const t = (value: Numeric, expectation: boolean) => {
		it(`isNegative(${JSON.stringify(value)})`, () => {
			expect(isNegative(value)).toBe(expectation)
		})
	}

	t(-1, true)
	t(-10000000, true)
	t(-0.1, true)
	t(-0.0001, true)
	t(-1000.0001, true)

	t(-0, false)
	t(0, false)
	t(1, false)
	t(10000000, false)
	t(0.1, false)
	t(0.0001, false)
	t(1000.0001, false)
})
