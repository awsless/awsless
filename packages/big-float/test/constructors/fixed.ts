import { fixed, Numeric, StringNumericLiteral } from '../../src'

describe('fixed', () => {
	const t = (value: Numeric, decimals: number, expectation: StringNumericLiteral) => {
		it(`fixed(${value}, ${decimals}) = ${expectation}`, () => {
			const result = fixed(value, decimals)
			expect(result).toBe(expectation)
		})
	}

	t('0', 0, '0')
	t('-0', 0, '0')
	t('1', 0, '1')
	t('-1', 0, '-1')
	t('1.1', 0, '1')
	t('1.1111', 0, '1')
	t('9999', 0, '9999')
	t('9999.9999', 0, '9999')

	t('0', 2, '0.00')
	t('-0', 2, '0.00')
	t('1', 2, '1.00')
	t('-1', 2, '-1.00')
	t('1.1', 2, '1.10')
	t('1.1111', 2, '1.11')
	t('9999', 2, '9999.00')
	t('9999.9999', 2, '9999.99')
})
