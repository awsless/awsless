import {
	abs,
	add,
	BigFloat,
	BILLION,
	ceil,
	div,
	EIGHT,
	eq,
	factor,
	FIVE,
	floor,
	FOUR,
	gt,
	gte,
	HUNDRED,
	lt,
	lte,
	max,
	MILLION,
	min,
	minmax,
	mul,
	neg,
	NINE,
	Numeric,
	ONE,
	pow,
	SEVEN,
	SIX,
	sqrt,
	sub,
	TEN,
	THOUSAND,
	THREE,
	TRILLION,
	TWO,
	ZERO,
} from '../src/index'

describe('BigFloat', () => {
	describe('construct', () => {
		it('BigFloat(1) == 1', () => expect(eq(new BigFloat(1), 1)).toBe(true))
	})

	describe('relational', () => {
		it('1 == 1', () => expect(eq(1, 1)).toBe(true))
		it('0 != 1', () => expect(eq(0, 1)).toBe(false))
		it('1 < 2', () => expect(lt(1, 2)).toBe(true))
		it('1 <= 2', () => expect(lte(1, 2)).toBe(true))
		it('2 <= 2', () => expect(lte(2, 2)).toBe(true))
		it('2 > 1', () => expect(gt(2, 1)).toBe(true))
		it('2 >= 1', () => expect(gte(2, 1)).toBe(true))
		it('2 >= 2', () => expect(gte(2, 2)).toBe(true))
	})

	describe('min', () => {
		it('min(1) = 1', () => expect(eq(min(1), 1)).toBe(true))
		it('min(1, 2, 3) = 1', () => expect(eq(min(1, 2, 3), 1)).toBe(true))
		it('min(1, 10) = 1', () => expect(eq(min(1, 10), 1)).toBe(true))
		it('min(1, 1.1) = 1', () => expect(eq(min(1, 1.1), 1)).toBe(true))
		it('min(1, 0) = 0', () => expect(eq(min(1, 0), 0)).toBe(true))
		it('min(1, -1) = -1', () => expect(eq(min(1, -1), -1)).toBe(true))
	})

	describe('max', () => {
		it('max(1) = 1', () => expect(eq(max(1), 1)).toBe(true))
		it('max(1, 2, 3) = 3', () => expect(eq(max(1, 2, 3), 3)).toBe(true))
		it('max(1, 10) = 10', () => expect(eq(max(1, 10), 10)).toBe(true))
		it('max(1, 1.1) = 1.1', () => expect(eq(max(1, 1.1), 1.1)).toBe(true))
		it('max(1, 0) = 1', () => expect(eq(max(1, 0), 1)).toBe(true))
		it('max(1, -1) = 1', () => expect(eq(max(1, -1), 1)).toBe(true))
	})

	describe('minmax', () => {
		it('minmax(1, 1, 1) = 1', () => expect(eq(minmax(1, 1, 1), 1)).toBe(true))
		it('minmax(1, 2, 3) = 2', () => expect(eq(minmax(1, 2, 3), 2)).toBe(true))
		it('minmax(5, 1, 10) = 5', () => expect(eq(minmax(5, 1, 10), 5)).toBe(true))
		it('minmax(20, 1, 10) = 10', () => expect(eq(minmax(20, 1, 10), 10)).toBe(true))
		it('minmax(1, -1, 1) = 1', () => expect(eq(minmax(1, -1, 1), 1)).toBe(true))
		it('minmax(5, 10, 0) throw TypeError', () => expect(() => eq(minmax(5, 10, 0), 10)).toThrow(TypeError))
	})

	describe('arithmetic', () => {
		it('1 + 1 = 2', () => expect(eq(add(1, 1), 2)).toBe(true))
		it('1 + 1 + 1 = 3', () => expect(eq(add(1, 1, 1), 3)).toBe(true))
		it('2 - 1 = 1', () => expect(eq(sub(2, 1), 1)).toBe(true))
		it('3 - 1 - 1 = 1', () => expect(eq(sub(3, 1, 1), 1)).toBe(true))
		it('2 * 2 = 4', () => expect(eq(mul(2, 2), 4)).toBe(true))
		it('2 * 2 * 2 = 8', () => expect(eq(mul(2, 2, 2), 8)).toBe(true))
		it('4 / 2 = 2', () => expect(eq(div(4, 2), 2)).toBe(true))
		it('2 ^ 2 = 4', () => expect(eq(pow(2, 2), 4)).toBe(true))
		it('sqrt(4) = 2', () => expect(eq(sqrt(4), 2)).toBe(true))
		it('ceil(0.5) = 1', () => expect(eq(ceil(0.5), 1)).toBe(true))
		it('floor(0.5) = 0', () => expect(eq(floor(0.5), 0)).toBe(true))

		it('abs(1) = 1', () => expect(eq(abs(1), 1)).toBe(true))
		it('abs(-1) = 1', () => expect(eq(abs(-1), 1)).toBe(true))

		it('neg(1) = -1', () => expect(eq(neg(1), -1)).toBe(true))
		it('neg(-1) = -1', () => expect(eq(neg(-1), 1)).toBe(true))

		it('factor(0) = 1', () => expect(eq(factor(0), 1)).toBe(true))
		it('factor(1) = 1', () => expect(eq(factor(1), 1)).toBe(true))
		it('factor(2) = 2', () => expect(eq(factor(2), 2)).toBe(true))
		it('factor(5) = 120', () => expect(eq(factor(5), 120)).toBe(true))
		it('factor(-1) = -1', () => expect(eq(factor(-1), -1)).toBe(true))
		it('factor(-2) = -2', () => expect(eq(factor(-2), -2)).toBe(true))
		it('factor(-5) = -120', () => expect(eq(factor(-5), -120)).toBe(true))
	})

	describe('floor', () => {
		const test = (value: Numeric, precision: number, expectation: Numeric) => {
			it(`floor(${value}, ${precision}) = ${expectation}`, () => {
				const result = floor(value, precision)
				expect(eq(result, expectation)).toBe(true)
			})
		}

		test('0.5555555555', 0, 0)
		test('0.5555555555', 2, 0.55)
		test('0.5555555555', 8, '0.55555555')
	})

	describe('ceil', () => {
		const test = (value: Numeric, precision: number, expectation: Numeric) => {
			it(`floor(${value}, ${precision}) = ${expectation}`, () => {
				const result = ceil(value, precision)
				expect(eq(result, expectation)).toBe(true)
			})
		}

		test('0.5555555555', 0, 1)
		test('0.5555555555', 2, 0.56)
		test('0.5555555555', 8, '0.55555556')
	})

	describe('constants', () => {
		const test = (value: BigFloat, expectation: Numeric) => {
			it(`${value} = ${expectation}`, () => {
				expect(eq(value, expectation)).toBe(true)
			})
		}

		test(ZERO, '0')
		test(ONE, '1')
		test(TWO, '2')
		test(THREE, '3')
		test(FOUR, '4')
		test(FIVE, '5')
		test(SIX, '6')
		test(SEVEN, '7')
		test(EIGHT, '8')
		test(NINE, '9')
		test(TEN, '10')

		test(HUNDRED, '100')
		test(THOUSAND, '1000')
		test(MILLION, '1000000')
		test(BILLION, '1000000000')
		test(TRILLION, '1000000000000')
	})
})
