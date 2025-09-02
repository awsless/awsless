import { parse, string } from './internal'
import { IBigFloat, Numeric } from './type'

/**
 * Represents an arbitrary-precision floating point number.
 *
 * A BigFloat consists of a `coefficient` (bigint) and an `exponent` (number),
 * similar to scientific notation: `coefficient × 10^exponent`.
 */
export class BigFloat implements IBigFloat {
	/**
	 * The power of 10 applied to the coefficient.
	 * @type {number}
	 */
	readonly exponent: number

	/**
	 * The integer coefficient of the floating-point number.
	 * @type {bigint}
	 */
	readonly coefficient: bigint

	/**
	 * Creates a new BigFloat instance from a numeric value.
	 * @param {Numeric} n - The number to parse into a BigFloat.
	 */
	constructor(n: Numeric) {
		const { exponent, coefficient } = parse(n)
		this.exponent = exponent
		this.coefficient = coefficient
	}

	/**
	 * Converts the BigFloat to a JSON-compatible string representation.
	 * Equivalent to calling {@link BigFloat.toString}.
	 * @returns {string} A string representation of the BigFloat.
	 */
	toJSON() {
		return this.toString()
	}

	/**
	 * Converts the BigFloat to its string representation.
	 * @param {number} [radix] - The base/radix for string conversion (e.g. 10 for decimal, 16 for hex).
	 * @returns {string} A string representation of the BigFloat.
	 */
	toString(radix?: number) {
		return string(this, radix)
	}
}
