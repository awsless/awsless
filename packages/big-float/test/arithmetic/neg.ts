import { eq, neg, Numeric, string } from '../../src'

describe('neg', () => {
	const t = (n: Numeric, expectation: Numeric) => {
		it(`neg(${n}) = ${expectation}`, () => {
			const result = neg(n)
			expect(result.toString()).toBe(string(expectation))
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t('0', '0')
	t('-1', '1')
	t('-11.121', '11.121')
	t('0.023842', '-0.023842')
	t('1.19', '-1.19')
	t('-3838.2', '3838.2')
	t('-127', '127')
	t('4.23073', '-4.23073')
	t('2.5469', '-2.5469')
	t('-2.0685908346593874980567875e+25', '20685908346593874980567875')
})
