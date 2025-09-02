import { eq, Numeric, scientific } from '../../src'

describe('scientific', () => {
	const t = (value: Numeric, expectation: Numeric) => {
		it(`scientific(${value}) = ${expectation}`, () => {
			const result = scientific(value)

			expect(result).toBe(expectation)
			expect(eq(result, expectation)).toBe(true)
		})
	}

	// Original test cases
	t('8000000', '8e6')
	t('-8000000', '-8e6')
	t('0.000008', '8e-6')
	t('-0.000008', '-8e-6')

	// Zero and near-zero values
	t('0', '0')
	t('0.0', '0')
	t('0.00000000000000000001', '1e-20')
	t('-0', '0')

	// Boundary cases for when scientific notation kicks in
	t('1000000', '1e6')
	t('999999', '9.99999e5')
	t('0.0001', '1e-4')
	t('0.00001', '1e-5')
	t('10000000', '1e7')
	t('0.0000001', '1e-7')

	// Very large numbers
	t('123000000000000000', '1.23e17')
	t('1230000000000000000', '1.23e18')
	t('9990000000000000000', '9.99e18')

	// Very small numbers
	t('0.000000000000000123', '1.23e-16')
	t('0.0000000000000000123', '1.23e-17')
	t('0.0000000000000000999', '9.99e-17')

	// Numbers with trailing zeros
	t('1200000', '1.2e6')
	t('0.000012000', '1.2e-5')
	t('8000000.0', '8e6')
	t('1500000000', '1.5e9')
	t('0.000000150', '1.5e-7')

	// Numbers with many significant digits
	t('1234567890', '1.23456789e9')
	t('0.000123456789', '1.23456789e-4')
	t('12345678901234567890', '1.234567890123456789e19')

	// Already in scientific notation (should remain unchanged or normalized)
	t('1e6', '1e6')
	t('1.5e-3', '1.5e-3')
	t('2.5e4', '2.5e4')
	t('1.23e10', '1.23e10')
	t('9.99e-15', '9.99e-15')

	// More negative cases
	t('-1', '-1')
	t('-12', '-1.2e1')
	t('-1000000', '-1e6')
	t('-0.000001', '-1e-6')
	t('-1.23e10', '-1.23e10')
	t('-999999', '-9.99999e5')
	t('-0.0001', '-1e-4')

	// Edge cases with 1
	t('1000000000', '1e9')
	t('0.000000001', '1e-9')
	t('-1000000000', '-1e9')
	t('-0.000000001', '-1e-9')

	// Decimal precision cases
	t('1.0000001e6', '1.0000001e6')
	t('9.9999999e-5', '9.9999999e-5')
	t('1.000000000000001', '1.000000000000001')

	// Mixed format cases
	t('1.5e+6', '1.5e6')
	t('2.5E-4', '2.5e-4')
	t('3.14E+10', '3.14e10')

	// Very precise small numbers
	t('0.00000000000000000000123', '1.23e-21')
	t('0.000000000000000000000001', '1e-24')

	// Very large precise numbers
	t('123000000000000000000000', '1.23e23')
	t('999000000000000000000000', '9.99e23')
})
