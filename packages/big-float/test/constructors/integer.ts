import { eq, integer, Numeric } from '../../src'

describe('integer', () => {
	const t = (value: Numeric, expectation: Numeric) => {
		it(`integer(${value}) = ${expectation}`, () => {
			const result = integer(value)
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t('0', '0')
	t('-0', '0')
	t('1', '1')
	t('-1', '-1')
	t('1.1', '1')
	t('-1.1', '-1')
	t('1.00000000001', '1')
	t('-1.00000000001', '-1')
	t('1000', '1000')
	t('-1000', '-1000')
	t('1000.00000000001', '1000')
	t('-1000.00000000001', '-1000')
})
