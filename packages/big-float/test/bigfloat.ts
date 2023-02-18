
import { describe, it, expect } from 'vitest'
import { abs, add, BigFloat, ceil, div, eq, floor, gt, gte, lt, lte, mul, neg, Numeric, pow, sqrt, sub } from '../src/index'

describe('BigFloat', () => {

	describe('construct', () => {
		it('BigFloat(1) == 1', () => expect(eq(new BigFloat(1), 1)).toBe(true))
	})

	describe('relational', () => {
		it('1 == 1', () => expect(eq(1, 1)).toBe(true))
		it('1 < 2', () => expect(lt(1, 2)).toBe(true))
		it('1 <= 2', () => expect(lte(1, 2)).toBe(true))
		it('2 <= 2', () => expect(lte(2, 2)).toBe(true))
		it('2 > 1', () => expect(gt(2, 1)).toBe(true))
		it('2 >= 1', () => expect(gte(2, 1)).toBe(true))
		it('2 >= 2', () => expect(gte(2, 2)).toBe(true))
	})

	describe('arithmetic', () => {
		it('1 + 1 = 2', () => expect(eq(add(1, 1), 2)).toBe(true))
		it('1 + 1 + 1 = 3', () => expect(eq(add(1, 1, 1), 3)).toBe(true))
		it('2 - 1 = 1', () => expect(eq(sub(2, 1), 1)).toBe(true))
		it('3 - 1 - 1 = 1', () => expect(eq(sub(3, 1, 1), 1)).toBe(true))
		it('2 * 2 = 4', () => expect(eq(mul(2, 2), 4)).toBe(true))
		it('4 / 2 = 2', () => expect(eq(div(4, 2), 2)).toBe(true))
		it('2 ^ 2 = 4', () => expect(eq(pow(2, 2), 4)).toBe(true))
		it('sqrt(4) = 2', () => expect(eq(sqrt(4), 2)).toBe(true))
		it('ceil(0.5) = 1', () => expect(eq(ceil(.5), 1)).toBe(true))
		it('floor(0.5) = 0', () => expect(eq(floor(.5), 0)).toBe(true))
		it('abs(1) = 1', () => expect(eq(abs(1), 1)).toBe(true))
		it('abs(-1) = 1', () => expect(eq(abs(-1), 1)).toBe(true))
		it('neg(1) = -1', () => expect(eq(neg(1), -1)).toBe(true))
		it('neg(-1) = -1', () => expect(eq(neg(-1), 1)).toBe(true))
	})

	describe('floor', () => {
		const test = (value:Numeric, precision:number, expectation:Numeric) => {
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
		const test = (value:Numeric, precision:number, expectation:Numeric) => {
			it(`floor(${value}, ${precision}) = ${expectation}`, () => {
				const result = ceil(value, precision)
				expect(eq(result, expectation)).toBe(true)
			})
		}

		test('0.5555555555', 0, 1)
		test('0.5555555555', 2, 0.56)
		test('0.5555555555', 8, '0.55555556')
	})
})
