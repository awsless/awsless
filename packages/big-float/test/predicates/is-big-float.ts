import { BigFloat, isBigFloat } from '../../src'

describe('isBigFloat', () => {
	const t = (value: unknown, expectation: boolean) => {
		it(`isBigFloat(${JSON.stringify(value)})`, () => {
			expect(isBigFloat(value)).toBe(expectation)
		})
	}

	t(new BigFloat(1), true)
	t(new BigFloat(0), true)
	t(new BigFloat(-1), true)
	t(new BigFloat(100), true)
	t(new BigFloat(0.001), true)

	t(undefined, false)
	t(null, false)
	t({}, false)
	t([], false)
	t(0, false)
	t('', false)
})
