type IBigFloat = {
    readonly exponent: number;
    readonly coefficient: bigint;
};
type Numeric = IBigFloat | number | bigint | string;

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
     * @returns {string} A string representation of the BigFloat.
     */
    toJSON(): string;
    /**
     * Converts the BigFloat to its string representation.
     * @param {number} [radix] - The base/radix for string conversion (e.g. 10 for decimal, 16 for hex).
     * @returns {string} A string representation of the BigFloat.
     */
    toString(radix?: number): string;
}

/**
 * Returns the negation of a number.
 * @param {Numeric} n - The number to negate.
 * @returns {BigFloat} The negated value of `n`.
 */
declare const neg$1: (n: Numeric) => BigFloat;
/**
 * Returns the absolute value of a number.
 * @param {Numeric} n - The number to get the absolute value of.
 * @returns {BigFloat} The absolute value of `n`.
 */
declare const abs$1: (n: Numeric) => BigFloat;
/**
 * Adds two or more numbers together.
 * @param {Numeric} n - The first addend.
 * @param {...Numeric} other - Additional numbers to add.
 * @returns {BigFloat} The sum of all arguments.
 */
declare const add$1: (n: Numeric, ...other: Numeric[]) => BigFloat;
/**
 * Subtracts numbers from the first number.
 * @param {Numeric} n - The initial value.
 * @param {...Numeric} other - Numbers to subtract from `n`.
 * @returns {BigFloat} The result of the subtraction.
 */
declare const sub$1: (n: Numeric, ...other: Numeric[]) => BigFloat;
/**
 * Multiplies two or more numbers together.
 * @param {Numeric} multiplicand - The first number.
 * @param {...Numeric} multipliers - Additional numbers to multiply with.
 * @returns {BigFloat} The product of all arguments.
 */
declare const mul$1: (multiplicand: Numeric, ...multipliers: Numeric[]) => BigFloat;
/**
 * Divides one number by another with optional precision.
 * @param {Numeric} dividend - The numerator.
 * @param {Numeric} divisor - The denominator.
 * @param {number} [precision] - Optional precision for the division.
 * @returns {BigFloat} The quotient of the division.
 */
declare const div$1: (dividend: Numeric, divisor: Numeric, precision?: number) => BigFloat;
/**
 * Returns the square root of a number.
 * @param {Numeric} n - The number to take the square root of.
 * @returns {BigFloat} The square root of `n`.
 */
declare const sqrt$1: (n: Numeric) => BigFloat;
/**
 * Rounds a number up to the nearest integer or given precision.
 * @param {Numeric} n - The number to round up.
 * @param {number} [precision=0] - The decimal precision to round to.
 * @param {number} [divisorPrecision] - Optional precision for internal division.
 * @returns {BigFloat} The rounded-up value.
 */
declare const ceil$1: (n: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
/**
 * Rounds a number down to the nearest integer or given precision.
 * @param {Numeric} n - The number to round down.
 * @param {number} [precision=0] - The decimal precision to round to.
 * @param {number} [divisorPrecision] - Optional precision for internal division.
 * @returns {BigFloat} The rounded-down value.
 */
declare const floor$1: (n: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
/**
 * Rounds a number to the nearest integer or given precision.
 * Similar to `Math.round`, but supports arbitrary-precision numbers (`BigFloat`).
 * @param {Numeric} n - The number to round.
 * @param {number} [precision=0] - The decimal precision to round to.
 * For example, `precision = 2` rounds to the nearest hundredth.
 * @param {number} [divisorPrecision] - Optional precision for internal division operations.
 * @returns {BigFloat} The number rounded to the specified precision.
 */
declare const round$1: (n: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
/**
 * Raises a number to a given power.
 * @param {Numeric} base - The base number.
 * @param {Numeric} exp - The exponent.
 * @returns {BigFloat} The result of `base^exp`.
 */
declare const pow$1: (base: Numeric, exp: Numeric) => BigFloat;
/**
 * Computes the factorial of a number.
 * @param {Numeric} n - The number to compute the factorial for.
 * @returns {BigFloat} The factorial of `n`.
 */
declare const fact$1: (n: Numeric) => BigFloat;

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

declare const make$1: (n: IBigFloat) => BigFloat;
/**
 * Returns the fractional part of a number.
 * @param {Numeric} n - The number to extract the fraction from.
 * @returns {BigFloat} The fractional part of `n`.
 */
declare const fraction$1: (n: Numeric) => BigFloat;
/**
 * Returns the integer part of a number.
 * @param {Numeric} n - The number to extract the integer part from.
 * @returns {BigFloat} The integer part of `n`.
 */
declare const integer$1: (n: Numeric) => BigFloat;
/**
 * Converts a number to its standard string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The string representation of `n`.
 */
declare const string$1: (n: Numeric) => string;
/**
 * Converts a number to its scientific notation string representation.
 * @param {Numeric} n - The number to convert.
 * @returns {string} The scientific notation of `n`.
 */
declare const scientific$1: (n: Numeric) => string;

declare let PRECISION: number;
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
declare const isInteger$1: (n: Numeric) => boolean;
/**
 * Checks whether a number is strictly less than zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is negative, otherwise false.
 */
declare const isNegative$1: (n: Numeric) => boolean;
/**
 * Checks whether a number is strictly greater than zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is positive, otherwise false.
 */
declare const isPositive$1: (n: Numeric) => boolean;
/**
 * Checks whether a number is equal to zero.
 * @param {Numeric} n - The number to check.
 * @returns {boolean} True if `n` is zero, otherwise false.
 */
declare const isZero$1: (n: Numeric) => boolean;

/**
 * Checks whether two numbers are equal.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a` and `b` are equal, otherwise false.
 */
declare const eq$1: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is less than the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a < b`, otherwise false.
 */
declare const lt$1: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is less than or equal to the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a <= b`, otherwise false.
 */
declare const lte$1: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is greater than the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a > b`, otherwise false.
 */
declare const gt$1: (a: Numeric, b: Numeric) => boolean;
/**
 * Checks whether the first number is greater than or equal to the second.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {boolean} True if `a >= b`, otherwise false.
 */
declare const gte$1: (a: Numeric, b: Numeric) => boolean;
/**
 * Compares two numbers and returns their ordering.
 * @param {Numeric} a - The first number.
 * @param {Numeric} b - The second number.
 * @returns {1 | -1 | 0} `1` if `a > b`, `-1` if `a < b`, `0` if they are equal.
 */
declare const cmp$1: (a: Numeric, b: Numeric) => 1 | -1 | 0;
/**
 * Returns the smallest of the given numbers.
 * @param {...Numeric} numbers - The numbers to compare.
 * @returns {BigFloat} The minimum value.
 */
declare const min$1: (...numbers: Numeric[]) => BigFloat;
/**
 * Returns the largest of the given numbers.
 * @param {...Numeric} numbers - The numbers to compare.
 * @returns {BigFloat} The maximum value.
 */
declare const max$1: (...numbers: Numeric[]) => BigFloat;
/**
 * Clamps a number between a minimum and maximum bound.
 * @param {Numeric} number - The number to clamp.
 * @param {Numeric} min - The minimum allowed value.
 * @param {Numeric} max - The maximum allowed value.
 * @returns {BigFloat} `number` constrained to the range `[min, max]`.
 */
declare const clamp$1: (number: Numeric, min: Numeric, max: Numeric) => BigFloat;

declare const add: (a: IBigFloat, b: IBigFloat) => IBigFloat;
declare const sub: (a: IBigFloat, b: IBigFloat) => IBigFloat;
declare const neg: (a: IBigFloat) => IBigFloat;
declare const abs: (a: IBigFloat) => IBigFloat;
declare const mul: (multiplicand: IBigFloat, multiplier: IBigFloat) => IBigFloat;
declare const div: (dividend: IBigFloat, divisor: IBigFloat, precision?: number) => IBigFloat;
declare const sqrt: (n: IBigFloat) => IBigFloat;
declare const pow: (base: IBigFloat, exp: IBigFloat) => IBigFloat;
declare const ceil: (n: IBigFloat) => IBigFloat;
declare const floor: (n: IBigFloat) => IBigFloat;
declare const round: (n: IBigFloat) => IBigFloat;
declare const fact: (n: IBigFloat) => IBigFloat;

declare const number: (a: Numeric) => number;
declare const normalize: (a: IBigFloat) => IBigFloat;
declare const integer: (a: IBigFloat) => IBigFloat;
declare const fraction: (a: IBigFloat) => IBigFloat;
declare const make: (coefficient: bigint, exponent: number) => IBigFloat;
declare const string: (a: IBigFloat, radix?: number) => string;
declare const scientific: (a: IBigFloat) => string;

declare const parse: (a: Numeric) => IBigFloat;

declare const isBigFloatLike: (n: Numeric) => n is IBigFloat;
declare const isNegative: (big: IBigFloat) => boolean;
declare const isPositive: (big: IBigFloat) => boolean;
declare const isZero: (big: IBigFloat) => boolean;
declare const isInteger: (big: IBigFloat) => boolean;

declare const eq: (comparahend: IBigFloat, comparator: IBigFloat) => boolean;
declare const lt: (comparahend: IBigFloat, comparator: IBigFloat) => boolean;
declare const lte: (comparahend: IBigFloat, comparator: IBigFloat) => boolean;
declare const gt: (comparahend: IBigFloat, comparator: IBigFloat) => boolean;
declare const gte: (comparahend: IBigFloat, comparator: IBigFloat) => boolean;
declare const cmp: (a: IBigFloat, b: IBigFloat) => 1 | -1 | 0;
declare const min: (...values: IBigFloat[]) => IBigFloat;
declare const max: (...values: IBigFloat[]) => IBigFloat;
declare const clamp: (number: IBigFloat, min: IBigFloat, max: IBigFloat) => IBigFloat;

declare const index_abs: typeof abs;
declare const index_add: typeof add;
declare const index_ceil: typeof ceil;
declare const index_clamp: typeof clamp;
declare const index_cmp: typeof cmp;
declare const index_div: typeof div;
declare const index_eq: typeof eq;
declare const index_fact: typeof fact;
declare const index_floor: typeof floor;
declare const index_fraction: typeof fraction;
declare const index_gt: typeof gt;
declare const index_gte: typeof gte;
declare const index_integer: typeof integer;
declare const index_isBigFloatLike: typeof isBigFloatLike;
declare const index_isInteger: typeof isInteger;
declare const index_isNegative: typeof isNegative;
declare const index_isPositive: typeof isPositive;
declare const index_isZero: typeof isZero;
declare const index_lt: typeof lt;
declare const index_lte: typeof lte;
declare const index_make: typeof make;
declare const index_max: typeof max;
declare const index_min: typeof min;
declare const index_mul: typeof mul;
declare const index_neg: typeof neg;
declare const index_normalize: typeof normalize;
declare const index_number: typeof number;
declare const index_parse: typeof parse;
declare const index_pow: typeof pow;
declare const index_round: typeof round;
declare const index_scientific: typeof scientific;
declare const index_sqrt: typeof sqrt;
declare const index_string: typeof string;
declare const index_sub: typeof sub;
declare namespace index {
  export { index_abs as abs, index_add as add, index_ceil as ceil, index_clamp as clamp, index_cmp as cmp, index_div as div, index_eq as eq, index_fact as fact, index_floor as floor, index_fraction as fraction, index_gt as gt, index_gte as gte, index_integer as integer, index_isBigFloatLike as isBigFloatLike, index_isInteger as isInteger, index_isNegative as isNegative, index_isPositive as isPositive, index_isZero as isZero, index_lt as lt, index_lte as lte, index_make as make, index_max as max, index_min as min, index_mul as mul, index_neg as neg, index_normalize as normalize, index_number as number, index_parse as parse, index_pow as pow, index_round as round, index_scientific as scientific, index_sqrt as sqrt, index_string as string, index_sub as sub };
}

export { BILLION, BigFloat, EIGHT, FIVE, FOUR, HUNDRED, type IBigFloat, MILLION, NINE, type Numeric, ONE, PRECISION, SEVEN, SIX, TEN, THOUSAND, THREE, TRILLION, TWO, ZERO, abs$1 as abs, add$1 as add, ceil$1 as ceil, clamp$1 as clamp, cmp$1 as cmp, div$1 as div, eq$1 as eq, fact$1 as fact, floor$1 as floor, fraction$1 as fraction, gt$1 as gt, gte$1 as gte, integer$1 as integer, index as internal, isBigFloat, isInteger$1 as isInteger, isNegative$1 as isNegative, isPositive$1 as isPositive, isZero$1 as isZero, lt$1 as lt, lte$1 as lte, make$1 as make, max$1 as max, min$1 as min, mul$1 as mul, neg$1 as neg, pow$1 as pow, round$1 as round, scientific$1 as scientific, setPrecision, sqrt$1 as sqrt, string$1 as string, sub$1 as sub };
