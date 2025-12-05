import { BigFloat } from './bigfloat'
import * as internal from './internal/index'
import { IBigFloat, Numeric, StringNumericLiteral } from './type'

export const make = (n: IBigFloat): BigFloat => {
	return new BigFloat(n)
}

/**
 * Parses a string or numeric value into a BigFloat instance.
 * @param {string | Numeric} n - The value to parse. Can be a numeric string or a Numeric type.
 * @returns {BigFloat} A BigFloat representation of the input value.
 * @throws {TypeError} If `n` cannot be parsed into a valid numeric value.
 */
export const parse = (n: string | Numeric): BigFloat => {
	return new BigFloat(n as Numeric)
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
export const string = (n: Numeric): StringNumericLiteral => {
	return internal.string(internal.parse(n))
}

/**
 * Converts a number to its scientific notation string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The scientific notation of `n`.
 */
export const scientific = (n: Numeric): StringNumericLiteral => {
	return internal.scientific(internal.parse(n))
}
