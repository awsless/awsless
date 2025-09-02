import { eq, floor, Numeric, string } from '../../src'

describe('floor', () => {
	const t = (expectation: Numeric, n: Numeric, p?: number) => {
		it(`floor(${n}, ${p}) = ${expectation}`, () => {
			const result = floor(n, p)
			expect(result.toString()).toBe(string(expectation))
			expect(eq(result, expectation)).toBe(true)
		})
	}

	t('0', '0')
	t('1', '1')
	t('0', '0.09')
	t('0', '0.9')
	t('0', '0.5')
	t('0', '0.4')
	t('0', '0.1')
	t('0', '0.01')
	t('0', '0.5555555555')
	t('0.55', '0.5555555555', 2)
	t('0', '0.0000000001', 2)
	t('0.55555555', '0.5555555555', 8)
	t('0', '0.0000000001', 8)
})
