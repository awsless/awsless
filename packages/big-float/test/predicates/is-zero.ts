import { isZero, Numeric } from '../../src'

describe('isZero', () => {
	const t = (value: Numeric, expectation: boolean) => {
		it(`isZero(${JSON.stringify(value)})`, () => {
			expect(isZero(value)).toBe(expectation)
		})
	}

	t(-0, true)
	t(0, true)

	t(-1, false)
	t(-10000000, false)
	t(-0.1, false)
	t(-0.0001, false)
	t(-1000.0001, false)
	t(1, false)
	t(10000000, false)
	t(0.1, false)
	t(0.0001, false)
	t(1000.0001, false)
})
