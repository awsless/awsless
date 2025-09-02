import { eq, fraction, Numeric } from '../../src'

describe('fraction', () => {
	const t = (value: Numeric, expectation: Numeric) => {
		it(`fraction(${value}) = ${expectation}`, () => {
			const result = fraction(value)
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t('0', '0')
	t('-0', '0')
	t('1', '0')
	t('-1', '0')
	t('1.1', '0.1')
	t('-1.1', '-0.1')
	t('1.00000000001', '0.00000000001')
	t('-1.00000000001', '-0.00000000001')
	t('1000', '0')
	t('-1000', '0')
	t('1000.00000000001', '0.00000000001')
	t('-1000.00000000001', '-0.00000000001')
})
