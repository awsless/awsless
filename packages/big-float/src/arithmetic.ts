import { BigFloat } from './bigfloat.js'
import { make } from './constructors'
import * as internal from './internal'
import { parse } from './internal'
import { Numeric } from './type'

/**
 * Returns the negation of a number.
 * @param {Numeric} n - The number to negate.
 * @returns {BigFloat} The negated value of `n`.
 */
export const neg = (n: Numeric): BigFloat => make(internal.neg(parse(n)))

/**
 * Returns the absolute value of a number.
 * @param {Numeric} n - The number to get the absolute value of.
 * @returns {BigFloat} The absolute value of `n`.
 */
export const abs = (n: Numeric): BigFloat => make(internal.abs(parse(n)))

/**
 * Adds two or more numbers together.
 * @param {Numeric} n - The first addend.
 * @param {...Numeric} other - Additional numbers to add.
 * @returns {BigFloat} The sum of all arguments.
 */
export const add = (n: Numeric, ...other: Numeric[]): BigFloat => {
	return make(
		other.map(parse).reduce((prev, current) => {
			return internal.add(prev, current)
		}, parse(n))
	)
}

/**
 * Subtracts numbers from the first number.
 * @param {Numeric} n - The initial value.
 * @param {...Numeric} other - Numbers to subtract from `n`.
 * @returns {BigFloat} The result of the subtraction.
 */
export const sub = (n: Numeric, ...other: Numeric[]): BigFloat => {
	return make(
		other.map(parse).reduce((prev, current) => {
			return internal.sub(prev, current)
		}, parse(n))
	)
}

/**
 * Multiplies two or more numbers together.
 * @param {Numeric} multiplicand - The first number.
 * @param {...Numeric} multipliers - Additional numbers to multiply with.
 * @returns {BigFloat} The product of all arguments.
 */
export const mul = (multiplicand: Numeric, ...multipliers: Numeric[]): BigFloat => {
	return make(
		multipliers.map(parse).reduce((prev, current) => {
			return internal.mul(prev, current)
		}, parse(multiplicand))
	)
}

/**
 * Divides one number by another with optional precision.
 * @param {Numeric} dividend - The numerator.
 * @param {Numeric} divisor - The denominator.
 * @param {number} [precision] - Optional precision for the division.
 * @returns {BigFloat} The quotient of the division.
 */
export const div = (dividend: Numeric, divisor: Numeric, precision?: number): BigFloat => {
	return make(internal.div(parse(dividend), parse(divisor), precision))
}

/**
 * Returns the square root of a number.
 * @param {Numeric} n - The number to take the square root of.
 * @returns {BigFloat} The square root of `n`.
 */
export const sqrt = (n: Numeric): BigFloat => make(internal.sqrt(parse(n)))

/**
 * Rounds a number up to the nearest integer or given precision.
 * @param {Numeric} n - The number to round up.
 * @param {number} [precision=0] - The decimal precision to round to.
 * @param {number} [divisorPrecision] - Optional precision for internal division.
 * @returns {BigFloat} The rounded-up value.
 */
export const ceil = (n: Numeric, precision: number = 0, divisorPrecision?: number): BigFloat => {
	const divisor = parse(Math.pow(10, precision))
	return make(internal.div(internal.ceil(internal.mul(parse(n), divisor)), divisor, divisorPrecision))
}

/**
 * Rounds a number down to the nearest integer or given precision.
 * @param {Numeric} n - The number to round down.
 * @param {number} [precision=0] - The decimal precision to round to.
 * @param {number} [divisorPrecision] - Optional precision for internal division.
 * @returns {BigFloat} The rounded-down value.
 */
export const floor = (n: Numeric, precision: number = 0, divisorPrecision?: number): BigFloat => {
	const divisor = parse(Math.pow(10, precision))
	return make(internal.div(internal.floor(internal.mul(parse(n), divisor)), divisor, divisorPrecision))
}

/**
 * Rounds a number to the nearest integer or given precision.
 * Similar to `Math.round`, but supports arbitrary-precision numbers (`BigFloat`).
 * @param {Numeric} n - The number to round.
 * @param {number} [precision=0] - The decimal precision to round to.
 * For example, `precision = 2` rounds to the nearest hundredth.
 * @param {number} [divisorPrecision] - Optional precision for internal division operations.
 * @returns {BigFloat} The number rounded to the specified precision.
 */
export const round = (n: Numeric, precision: number = 0, divisorPrecision?: number): BigFloat => {
	const divisor = parse(Math.pow(10, precision))
	return make(internal.div(internal.round(internal.mul(parse(n), divisor)), divisor, divisorPrecision))
}

/**
 * Raises a number to a given power.
 * @param {Numeric} base - The base number.
 * @param {Numeric} exp - The exponent.
 * @returns {BigFloat} The result of `base^exp`.
 */
export const pow = (base: Numeric, exp: Numeric): BigFloat => {
	return make(internal.pow(parse(base), parse(exp)))
}

/**
 * Computes the factorial of a number.
 * @param {Numeric} n - The number to compute the factorial for.
 * @returns {BigFloat} The factorial of `n`.
 */
export const fact = (n: Numeric): BigFloat => {
	return make(internal.fact(parse(n)))
}
