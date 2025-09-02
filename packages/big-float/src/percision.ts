export let PRECISION = 20

/**
 * Sets the global precision for BigFloat operations.
 *
 * Precision is expressed as a positive integer, where the magnitude determines
 * the number of decimal digits retained.
 * For example, `-10` means calculations will keep up to 10 decimal places.
 *
 * @param {number} n - The precision to set (must be a positive integer).
 * @throws {Error} If `n` is not a positive integer.
 * @returns {void}
 */
export const setPrecision = (n: number): void => {
	if (!Number.isInteger(n) || n < 0) {
		throw new TypeError('Only positive integers are allowed for precision')
	}

	PRECISION = n
}
