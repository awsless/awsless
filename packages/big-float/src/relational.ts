import { BigFloat } from './bigfloat.js'
import { make } from './constructors.js'
import * as internal from './internal'
import { parse } from './internal'
import { Numeric } from './type.js'

/**
 * Checks whether two numbers are equal.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a` and `b` are equal, otherwise false.
 */
export const eq = (a: Numeric, b: Numeric): boolean => internal.eq(parse(a), parse(b))

/**
 * Checks whether the first number is less than the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a < b`, otherwise false.
 */
export const lt = (a: Numeric, b: Numeric): boolean => internal.lt(parse(a), parse(b))

/**
 * Checks whether the first number is less than or equal to the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a <= b`, otherwise false.
 */
export const lte = (a: Numeric, b: Numeric): boolean => internal.lte(parse(a), parse(b))

/**
 * Checks whether the first number is greater than the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a > b`, otherwise false.
 */
export const gt = (a: Numeric, b: Numeric): boolean => internal.gt(parse(a), parse(b))

/**
 * Checks whether the first number is greater than or equal to the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a >= b`, otherwise false.
 */
export const gte = (a: Numeric, b: Numeric): boolean => internal.gte(parse(a), parse(b))

/**
 * Compares two numbers and returns their ordering.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {1 | -1 | 0} `1` if `a > b`, `-1` if `a < b`, `0` if they are equal.
 */
export const cmp = (a: Numeric, b: Numeric): 1 | -1 | 0 => {
	if (gt(a, b)) {
		return 1
	} else if (lt(a, b)) {
		return -1
	}

	return 0
}

/**
 * Returns the smallest of the given numbers.
 * @param {...Numeric} numbers - The numbers to compare.
 * @returns {BigFloat} The minimum value.
 */
export const min = (...numbers: Numeric[]): BigFloat => {
	return make(internal.min(...numbers.map(v => parse(v))))
}

/**
 * Returns the largest of the given numbers.
 * @param {...Numeric} numbers - The numbers to compare.
 * @returns {BigFloat} The maximum value.
 */
export const max = (...numbers: Numeric[]): BigFloat => {
	return make(internal.max(...numbers.map(v => parse(v))))
}

/**
 * Clamps a number between a minimum and maximum bound.
 * @param {Numeric} number - The number to clamp.
 * @param {Numeric} min - The minimum allowed value.
 * @param {Numeric} max - The maximum allowed value.
 * @returns {BigFloat} `number` constrained to the range `[min, max]`.
 */
export const clamp = (number: Numeric, min: Numeric, max: Numeric): BigFloat => {
	return make(internal.clamp(parse(number), parse(min), parse(max)))
}
