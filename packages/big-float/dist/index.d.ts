type IBigFloat = {
    readonly exponent: number;
    readonly coefficient: bigint;
};
type StringNumericLiteral = `${number}`;
type Numeric = IBigFloat | number | bigint | StringNumericLiteral;

/**
 * Represents an arbitrary-precision floating point number.
 *
 * A BigFloat consists of a `coefficient` (bigint) and an `exponent` (number),
 * similar to scientific notation: `coefficient × 10^exponent`.
 */
declare class BigFloat implements IBigFloat {
    /**
     * The power of 10 applied to the coefficient.
     * @type {number}
     */
    readonly exponent: number;
    /**
     * The integer coefficient of the floating-point number.
     * @type {bigint}
     */
    readonly coefficient: bigint;
    /**
     * Creates a new BigFloat instance from a numeric value.
     * @param {Numeric} n - The number to parse into a BigFloat.
     */
    constructor(n: Numeric);
    /**
     * Converts the BigFloat to a JSON-compatible string representation.
     * Equivalent to calling {@link BigFloat.toString}.
     * @returns {StringNumericLiteral} A string representation of the BigFloat.
     */
    toJSON(): StringNumericLiteral;
    /**
     * Converts the BigFloat to its string representation.
     * @param {number} [radix] - The base/radix for string conversion (e.g. 10 for decimal, 16 for hex).
     * @returns {StringNumericLiteral} A string representation of the BigFloat.
     */
    toString(radix?: number): StringNumericLiteral;
}

/**
 * Returns the negation of a number.
 * @param {Numeric} n - The number to negate.
 * @returns {BigFloat} The negated value of `n`.
 */
declare const neg: (n: Numeric) => BigFloat;
/**
 * Returns the absolute value of a number.
 * @param {Numeric} n - The number to get the absolute value of.
 * @returns {BigFloat} The absolute value of `n`.
 */
declare const abs: (n: Numeric) => BigFloat;
/**
 * Adds two or more numbers together.
 * @param {Numeric} n - The first addend.
 * @param {...Numeric} other - Additional numbers to add.
 * @returns {BigFloat} The sum of all arguments.
 */
declare const add: (n: Numeric, ...other: Numeric[]) => BigFloat;
/**
 * Subtracts numbers from the first number.
 * @param {Numeric} n - The initial value.
 * @param {...Numeric} other - Numbers to subtract from `n`.
 * @returns {BigFloat} The result of the subtraction.
 */
declare const sub: (n: Numeric, ...other: Numeric[]) => BigFloat;
/**
 * Multiplies two or more numbers together.
 * @param {Numeric} multiplicand - The first number.
 * @param {...Numeric} multipliers - Additional numbers to multiply with.
 * @returns {BigFloat} The product of all arguments.
 */
declare const mul: (multiplicand: Numeric, ...multipliers: Numeric[]) => BigFloat;
/**
 * Divides one number by another with optional precision.
 * @param {Numeric} dividend - The numerator.
 * @param {Numeric} divisor - The denominator.
 * @param {number} [precision] - Optional precision for the division.
 * @returns {BigFloat} The quotient of the division.
 */
declare const div: (dividend: Numeric, divisor: Numeric, precision?: number) => BigFloat;
/**
 * Returns the square root of a number.
 * @param {Numeric} n - The number to take the square root of.
 * @returns {BigFloat} The square root of `n`.
 */
declare const sqrt: (n: Numeric) => BigFloat;
/**
 * Rounds a number up to the nearest integer or given precision.
 * @param {Numeric} n - The number to round up.
 * @param {number} [precision=0] - The decimal precision to round to.
 * @param {number} [divisorPrecision] - Optional precision for internal division.
 * @returns {BigFloat} The rounded-up value.
 */
declare const ceil: (n: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
/**
 * Rounds a number down to the nearest integer or given precision.
 * @param {Numeric} n - The number to round down.
 * @param {number} [precision=0] - The decimal precision to round to.
 * @param {number} [divisorPrecision] - Optional precision for internal division.
 * @returns {BigFloat} The rounded-down value.
 */
declare const floor: (n: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
/**
 * Rounds a number to the nearest integer or given precision.
 * Similar to `Math.round`, but supports arbitrary-precision numbers (`BigFloat`).
 * @param {Numeric} n - The number to round.
 * @param {number} [precision=0] - The decimal precision to round to.
 * For example, `precision = 2` rounds to the nearest hundredth.
 * @param {number} [divisorPrecision] - Optional precision for internal division operations.
 * @returns {BigFloat} The number rounded to the specified precision.
 */
declare const round: (n: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
/**
 * Raises a number to a given power.
 * @param {Numeric} base - The base number.
 * @param {Numeric} exp - The exponent.
 * @returns {BigFloat} The result of `base^exp`.
 */
declare const pow: (base: Numeric, exp: Numeric) => BigFloat;
/**
 * Computes the factorial of a number.
 * @param {Numeric} n - The number to compute the factorial for.
 * @returns {BigFloat} The factorial of `n`.
 */
declare const fact: (n: Numeric) => BigFloat;

declare const ZERO: BigFloat;
declare const ONE: BigFloat;
declare const TWO: BigFloat;
declare const THREE: BigFloat;
declare const FOUR: BigFloat;
declare const FIVE: BigFloat;
declare const SIX: BigFloat;
declare const SEVEN: BigFloat;
declare const EIGHT: BigFloat;
declare const NINE: BigFloat;
declare const TEN: BigFloat;
declare const HUNDRED: BigFloat;
declare const THOUSAND: BigFloat;
declare const MILLION: BigFloat;
declare const BILLION: BigFloat;
declare const TRILLION: BigFloat;
declare const QUADRILLION: BigFloat;
declare const QUINTILLION: BigFloat;
declare const SEXTILLION: BigFloat;
declare const SEPTILLION: BigFloat;

declare const make: (n: IBigFloat) => BigFloat;
/**
 * Parses a string or numeric value into a BigFloat instance.
 * @param {string | Numeric} n - The value to parse. Can be a numeric string or a Numeric type.
 * @returns {BigFloat} A BigFloat representation of the input value.
 * @throws {TypeError} If `n` cannot be parsed into a valid numeric value.
 */
declare const parse: (n: string | Numeric) => BigFloat;
/**
 * Returns the fractional part of a number.
 * @param {Numeric} n - The number to extract the fraction from.
 * @returns {BigFloat} The fractional part of `n`.
 */
declare const fraction: (n: Numeric) => BigFloat;
/**
 * Returns the integer part of a number.
 * @param {Numeric} n - The number to extract the integer part from.
 * @returns {BigFloat} The integer part of `n`.
 */
declare const integer: (n: Numeric) => BigFloat;
/**
 * Converts a number to its standard string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The string representation of `n`.
 */
declare const string: (n: Numeric) => StringNumericLiteral;
/**
 * Converts a number to its scientific notation string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The scientific notation of `n`.
 */
declare const scientific: (n: Numeric) => StringNumericLiteral;

declare let PRECISION: number;
/**
 * Sets the global precision for BigFloat operations.
 *
 * Precision is expressed as a positive integer, where the magnitude determines
 * the number of decimal digits retained.
 * For example, `10` means calculations will keep up to 10 decimal places.
 *
 * @param {number} n - The precision to set (must be a positive integer).
 * @throws {TypeError} If `n` is not a positive integer.
 * @returns {void}
 */
declare const setPrecision: (n: number) => void;

/**
 * Checks whether a value is an instance of BigFloat.
 * @param {unknown} n - The value to check.
 * @returns {n is BigFloat} True if the value is a BigFloat, otherwise false.
 */
declare const isBigFloat: (n: unknown) => n is BigFloat;
/**
 * Checks whether a number is an integer.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is an integer, otherwise false.
 */
declare const isInteger: (n: Numeric) => boolean;
/**
 * Checks whether a number is strictly less than zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is negative, otherwise false.
 */
declare const isNegative: (n: Numeric) => boolean;
/**
 * Checks whether a number is strictly greater than zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is positive, otherwise false.
 */
declare const isPositive: (n: Numeric) => boolean;
/**
 * Checks whether a number is equal to zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is zero, otherwise false.
 */
declare const isZero: (n: Numeric) => boolean;

/**
 * Checks whether two numbers are equal.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a` and `b` are equal, otherwise false.
 */
declare const eq: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is less than the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a < b`, otherwise false.
 */
declare const lt: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is less than or equal to the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a <= b`, otherwise false.
 */
declare const lte: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is greater than the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a > b`, otherwise false.
 */
declare const gt: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is greater than or equal to the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a >= b`, otherwise false.
 */
declare const gte: (a: Numeric, b: Numeric) => boolean;
/**
 * Compares two numbers and returns their ordering.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {1 | -1 | 0} `1` if `a > b`, `-1` if `a < b`, `0` if they are equal.
 */
declare const cmp: (a: Numeric, b: Numeric) => 1 | -1 | 0;
/**
 * Returns the smallest of the given numbers.
 * @param {...Numeric} numbers - The numbers to compare.
 * @returns {BigFloat} The minimum value.
 */
declare const min: (...numbers: Numeric[]) => BigFloat;
/**
 * Returns the largest of the given numbers.
 * @param {...Numeric} numbers - The numbers to compare.
 * @returns {BigFloat} The maximum value.
 */
declare const max: (...numbers: Numeric[]) => BigFloat;
/**
 * Clamps a number between a minimum and maximum bound.
 * @param {Numeric} number - The number to clamp.
 * @param {Numeric} min - The minimum allowed value.
 * @param {Numeric} max - The maximum allowed value.
 * @returns {BigFloat} `number` constrained to the range `[min, max]`.
 */
declare const clamp: (number: Numeric, min: Numeric, max: Numeric) => BigFloat;

export { BILLION, BigFloat, EIGHT, FIVE, FOUR, HUNDRED, type IBigFloat, MILLION, NINE, type Numeric, ONE, PRECISION, QUADRILLION, QUINTILLION, SEPTILLION, SEVEN, SEXTILLION, SIX, type StringNumericLiteral, TEN, THOUSAND, THREE, TRILLION, TWO, ZERO, abs, add, ceil, clamp, cmp, div, eq, fact, floor, fraction, gt, gte, integer, isBigFloat, isInteger, isNegative, isPositive, isZero, lt, lte, make, max, min, mul, neg, parse, pow, round, scientific, setPrecision, sqrt, string, sub };
