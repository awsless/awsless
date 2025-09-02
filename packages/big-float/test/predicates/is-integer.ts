import { isInteger, Numeric } from '../../src'

describe('isInteger', () => {
	const t = (value: Numeric, expectation: boolean) => {
		it(`isInteger(${JSON.stringify(value)})`, () => {
			expect(isInteger(value)).toBe(expectation)
		})
	}

	t(0, true)
	t(-0, true)
	t(1, true)
	t(-1, true)
	t(10000000, true)
	t(-10000000, true)

	t(0.1, false)
	t(-0.1, false)
	t(0.0001, false)
	t(-0.0001, false)
	t(1000.0001, false)
	t(-1000.0001, false)
})
