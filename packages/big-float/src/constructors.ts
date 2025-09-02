import { BigFloat } from './bigfloat'
import * as internal from './internal/index'
import { IBigFloat, Numeric } from './type'

export const make = (n: IBigFloat): BigFloat => {
	return new BigFloat(n)
}

/**
 * Returns the fractional part of a number.
 * @param {Numeric} n - The number to extract the fraction from.
 * @returns {BigFloat} The fractional part of `n`.
 */
export const fraction = (n: Numeric): BigFloat => {
	return make(internal.fraction(internal.parse(n)))
}

/**
 * Returns the integer part of a number.
 * @param {Numeric} n - The number to extract the integer part from.
 * @returns {BigFloat} The integer part of `n`.
 */
export const integer = (n: Numeric): BigFloat => {
	return make(internal.integer(internal.parse(n)))
}

/**
 * Converts a number to its standard string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The string representation of `n`.
 */
export const string = (n: Numeric): string => {
	return internal.string(internal.parse(n))
}

/**
 * Converts a number to its scientific notation string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The scientific notation of `n`.
 */
export const scientific = (n: Numeric): string => {
	return internal.scientific(internal.parse(n))
}
