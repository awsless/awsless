import { ceil, eq, Numeric, string } from '../../src'

describe('ceil', () => {
	const t = (expectation: Numeric, n: Numeric, p?: number) => {
		it(`ceil(${n}, ${p}) = ${expectation}`, () => {
			const result = ceil(n, p)
			expect(result.toString()).toBe(string(expectation))
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t('0', '0')
	t('1', '1')
	t('1', '0.09')
	t('1', '0.9')
	t('1', '0.5')
	t('1', '0.4')
	t('1', '0.1')
	t('1', '0.01')
	t('1', '0.5555555555')
	t('0.56', '0.5555555555', 2)
	t('0.01', '0.0000000001', 2)
	t('0.55555556', '0.5555555555', 8)
	t('0.00000001', '0.0000000001', 8)
})
