import {
	BigFloat,
	BILLION,
	EIGHT,
	eq,
	FIVE,
	FOUR,
	HUNDRED,
	MILLION,
	NINE,
	ONE,
	SEVEN,
	SIX,
	string,
	TEN,
	THOUSAND,
	THREE,
	TRILLION,
	TWO,
	ZERO,
} from '../src'

describe('constants', () => {
	const t = (value: BigFloat, expectation: number) => {
		it(`${value} = ${expectation}`, () => {
			expect(value.toString()).toBe(string(expectation))
			expect(eq(value, expectation)).toBe(true)
		})
	}

	t(ZERO, 0)
	t(ONE, 1)
	t(TWO, 2)
	t(THREE, 3)
	t(FOUR, 4)
	t(FIVE, 5)
	t(SIX, 6)
	t(SEVEN, 7)
	t(EIGHT, 8)
	t(NINE, 9)
	t(TEN, 10)

	t(HUNDRED, 100)
	t(THOUSAND, 1_000)
	t(MILLION, 1_000_000)
	t(BILLION, 1_000_000_000)
	t(TRILLION, 1_000_000_000_000)
})
