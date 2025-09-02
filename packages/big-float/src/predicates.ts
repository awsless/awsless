import { BigFloat } from './bigfloat'
import * as internal from './internal'
import { parse } from './internal'
import { Numeric } from './type'

/**
 * Checks whether a value is an instance of BigFloat.
 * @param {unknown} n - The value to check.
 * @returns {n is BigFloat} True if the value is a BigFloat, otherwise false.
 */
export const isBigFloat = (n: unknown): n is BigFloat => {
	return n instanceof BigFloat
}

/**
 * Checks whether a number is an integer.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is an integer, otherwise false.
 */
export const isInteger = (n: Numeric): boolean => {
	return internal.isInteger(parse(n))
}

/**
 * Checks whether a number is strictly less than zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is negative, otherwise false.
 */
export const isNegative = (n: Numeric): boolean => {
	return internal.isNegative(parse(n))
}

/**
 * Checks whether a number is strictly greater than zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is positive, otherwise false.
 */
export const isPositive = (n: Numeric): boolean => {
	return internal.isPositive(parse(n))
}

/**
 * Checks whether a number is equal to zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is zero, otherwise false.
 */
export const isZero = (n: Numeric): boolean => {
	return internal.isZero(parse(n))
}

// export const isNumber = (strval: string) => {
// 	return is_number(strval)
// }
