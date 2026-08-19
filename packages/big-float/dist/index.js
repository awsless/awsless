//#region src/percision.ts
let PRECISION = 12;
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
const setPrecision = (n) => {
	if (!Number.isInteger(n) || n < 0) throw new TypeError("Only positive integers are allowed for precision");
	PRECISION = n;
};
//#endregion
//#region src/internal/relational.ts
const eq$1 = (comparahend, comparator) => {
	return comparahend === comparator || isZero$1(sub$1(comparahend, comparator));
};
const lt$1 = (comparahend, comparator) => {
	return isNegative$1(sub$1(comparahend, comparator));
};
const lte$1 = (comparahend, comparator) => {
	return lt$1(comparahend, comparator) || eq$1(comparahend, comparator);
};
const gt$1 = (comparahend, comparator) => {
	return lt$1(comparator, comparahend);
};
const gte$1 = (comparahend, comparator) => {
	return gt$1(comparahend, comparator) || eq$1(comparahend, comparator);
};
const min$1 = (...values) => {
	return values.reduce((prev, current) => {
		return lt$1(prev, current) ? prev : current;
	});
};
const max$1 = (...values) => {
	return values.reduce((prev, current) => {
		return gt$1(prev, current) ? prev : current;
	});
};
const clamp$1 = (number, min, max) => {
	if (gt$1(min, max)) throw new TypeError(`min ${min.toString()} bound can't be greater then the max ${max.toString()} bound`);
	return lt$1(number, min) ? min : gt$1(number, max) ? max : number;
};
//#endregion
//#region src/internal/predicates.ts
const isBigFloatLike = (n) => {
	return typeof n === "object" && "coefficient" in n && typeof n.coefficient === "bigint" && "exponent" in n && typeof n.exponent === "number" && Number.isSafeInteger(n.exponent);
};
const isNegative$1 = (big) => {
	return big.coefficient < 0n;
};
const isPositive$1 = (big) => {
	return big.coefficient > 0n;
};
const isZero$1 = (big) => {
	return big.coefficient === 0n;
};
const isInteger$1 = (big) => {
	return eq$1(big, integer$1(big));
};
//#endregion
//#region src/internal/constructors.ts
const number = (a) => {
	if (typeof a === "number") return a;
	if (typeof a === "string" || typeof a === "bigint") return Number(a);
	return a.exponent === 0 ? Number(a.coefficient) : Number(a.coefficient) * 10 ** a.exponent;
};
const normalize = (a) => {
	let { coefficient, exponent } = a;
	if (exponent !== 0) {
		if (exponent > 0) {
			coefficient = coefficient * 10n ** BigInt(exponent);
			exponent = 0;
		} else {
			while (exponent <= -7) {
				if (coefficient % 10000000n !== 0n) break;
				coefficient = coefficient / 10000000n;
				exponent += 7;
			}
			while (exponent < 0) {
				if (coefficient % 10n !== 0n) break;
				coefficient = coefficient / 10n;
				exponent += 1;
			}
		}
	}
	return make$1(coefficient, exponent);
};
const integer$1 = (a) => {
	const { coefficient, exponent } = a;
	if (exponent === 0) return a;
	if (exponent > 0) return make$1(coefficient * 10n ** BigInt(exponent), 0);
	return make$1(coefficient / 10n ** BigInt(-exponent), 0);
};
const fraction$1 = (a) => {
	return sub$1(a, integer$1(a));
};
const prototype = { toString(radix) {
	return string$1(this, radix);
} };
const make$1 = (coefficient, exponent) => {
	const bigfloat = Object.create(prototype);
	bigfloat.coefficient = coefficient;
	bigfloat.exponent = exponent;
	Object.freeze(bigfloat);
	return bigfloat;
};
const string$1 = (a, radix) => {
	if (isZero$1(a)) return "0";
	if (radix) return integer$1(a).coefficient.toString(radix);
	a = normalize(a);
	const isNeg = isNegative$1(a);
	let s = (isNeg ? -a.coefficient : a.coefficient).toString();
	if (a.exponent < 0) {
		let point = s.length + a.exponent;
		if (point <= 0) {
			s = "0".repeat(1 - point) + s;
			point = 1;
		}
		s = s.slice(0, point) + "." + s.slice(point);
	} else if (a.exponent > 0) s += "0".repeat(a.exponent);
	if (isNeg) s = "-" + s;
	return s;
};
const fixed$1 = (a, decimals) => {
	const [integer = "0", fraction = ""] = string$1(a).split(".");
	if (decimals === 0) return integer;
	return `${integer}.${fraction.slice(0, decimals).padEnd(decimals, "0")}`;
};
const scientific$1 = (a) => {
	if (isZero$1(a)) return "0";
	a = normalize(a);
	const isNeg = isNegative$1(a);
	let s = String(isNeg ? -a.coefficient : a.coefficient);
	const e = a.exponent + s.length - 1;
	if (s.length > 1) {
		let fractionalPart = s.slice(1);
		fractionalPart = fractionalPart.replace(/0+$/, "");
		if (fractionalPart.length > 0) s = s.slice(0, 1) + "." + fractionalPart;
		else s = s.slice(0, 1);
	}
	if (e !== 0) s += "e" + e;
	if (isNeg) s = "-" + s;
	return s;
};
//#endregion
//#region src/internal/parser.ts
const parse$1 = (a) => {
	if (typeof a === "bigint") return make$1(a, 0);
	else if (typeof a === "string" || typeof a === "number") {
		const parts = String(a).match(/^(-?\d+)(?:\.(\d*))?(?:e([-+]?\d+))?$/i);
		if (parts) {
			const frac = parts[2] ?? "";
			return make$1(BigInt(parts[1] + frac), Number(parts[3] ?? 0) - frac.length);
		}
	} else if (isBigFloatLike(a)) return a;
	throw new TypeError("Invalid BigFloat");
};
//#endregion
//#region src/internal/constants.ts
const EPSILON = /* @__PURE__ */ parse$1("0.0000000000000000000000000000000000000000000000001");
const ZERO$1 = /* @__PURE__ */ parse$1("0");
const ONE$1 = /* @__PURE__ */ parse$1("1");
const TWO$1 = /* @__PURE__ */ parse$1("2");
const NEG_ONE = /* @__PURE__ */ parse$1("-1");
//#endregion
//#region src/internal/arithmetic.ts
const conformOp = (op) => {
	return (a, b) => {
		const differential = a.exponent - b.exponent;
		if (differential === 0) return make$1(op(a.coefficient, b.coefficient), a.exponent);
		if (differential > 0) return make$1(op(a.coefficient * 10n ** BigInt(differential), b.coefficient), b.exponent);
		return make$1(op(a.coefficient, b.coefficient * 10n ** BigInt(-differential)), a.exponent);
	};
};
const add$1 = conformOp((a, b) => a + b);
const sub$1 = conformOp((a, b) => a - b);
const neg$1 = (a) => {
	return make$1(-a.coefficient, a.exponent);
};
const abs$1 = (a) => {
	return isNegative$1(a) ? neg$1(a) : a;
};
const mul$1 = (multiplicand, multiplier) => {
	return make$1(multiplicand.coefficient * multiplier.coefficient, multiplicand.exponent + multiplier.exponent);
};
const div$1 = (dividend, divisor, precision = PRECISION) => {
	if (isZero$1(divisor)) throw new TypeError("Divide by zero");
	if (isZero$1(dividend)) return ZERO$1;
	if (!Number.isInteger(precision) || precision < 0) throw new TypeError("Only positive integers are allowed for precision");
	if (precision === 0) return integer$1(div$1(dividend, divisor, 10));
	const extraPrecision = 1;
	const p = -(precision + extraPrecision);
	let { coefficient, exponent } = dividend;
	exponent -= divisor.exponent;
	if (exponent > p) {
		coefficient = coefficient * 10n ** BigInt(exponent - p);
		exponent = p;
	}
	const quotient = coefficient / divisor.coefficient;
	const isNegativeResult = quotient < 0n;
	const roundedAbsQuotient = ((isNegativeResult ? -quotient : quotient) + 5n) / 10n;
	const roundedQuotient = isNegativeResult ? -roundedAbsQuotient : roundedAbsQuotient;
	const finalExponent = exponent + extraPrecision;
	return make$1(roundedQuotient, finalExponent);
};
const sqrt$1 = (n) => {
	if (isZero$1(n)) return ZERO$1;
	if (eq$1(n, ONE$1)) return ONE$1;
	if (isNegative$1(n)) throw new TypeError("No square root");
	let x;
	const bitLength = n.coefficient.toString().length + n.exponent;
	if (bitLength > 0) {
		const halfBitLength = Math.floor(bitLength / 2);
		x = make$1(10n ** BigInt(Math.max(0, halfBitLength - 1)), 0);
	} else x = n;
	let prev;
	let iterations = 0;
	const maxIterations = 100;
	do {
		prev = x;
		x = div$1(add$1(x, div$1(n, x)), TWO$1);
		iterations++;
		if (iterations > 10) {
			const diff = abs$1(sub$1(x, prev));
			if (gt$1(diff, div$1(abs$1(x), make$1(1000n, 0)))) break;
		}
	} while (gt$1(abs$1(sub$1(x, prev)), EPSILON) && iterations < maxIterations);
	return x;
};
const pow$1 = (base, exp) => {
	if (eq$1(exp, ZERO$1)) return ONE$1;
	if (isNegative$1(exp)) return div$1(ONE$1, pow$1(base, abs$1(exp)));
	if (exp.exponent === 0) {
		let result = base;
		let n = 1;
		while (n !== number(exp)) {
			result = mul$1(result, base);
			n += 1;
		}
		return result;
	}
	if (gt$1(exp, ONE$1) || eq$1(exp, ONE$1)) {
		const temp = pow$1(base, div$1(exp, TWO$1));
		return mul$1(temp, temp);
	}
	let low = ZERO$1;
	let high = ONE$1;
	let sqr = sqrt$1(base);
	let acc = sqr;
	let mid = div$1(high, TWO$1);
	while (gt$1(abs$1(sub$1(mid, exp)), EPSILON)) {
		sqr = sqrt$1(sqr);
		if (lt$1(mid, exp) || eq$1(mid, exp)) {
			low = mid;
			acc = mul$1(acc, sqr);
		} else {
			high = mid;
			acc = mul$1(acc, div$1(ONE$1, sqr));
		}
		mid = div$1(add$1(low, high), TWO$1);
	}
	return acc;
};
const ceil$1 = (n) => {
	if (isInteger$1(n)) return n;
	else return make$1(integer$1(n).coefficient + 1n, 0);
};
const floor$1 = (n) => {
	return integer$1(n);
};
const round$1 = (n) => {
	if (n.exponent >= 0) return n;
	const factor = 10n ** BigInt(-n.exponent);
	if (isNegative$1(n)) return make$1((n.coefficient - factor / 2n) / factor, 0);
	return make$1((n.coefficient + factor / 2n) / factor, 0);
};
const fact$1 = (n) => {
	if (lt$1(n, ZERO$1)) return mul$1(NEG_ONE, fact$1(mul$1(n, NEG_ONE)));
	if (eq$1(n, ZERO$1) || eq$1(n, ONE$1)) return ONE$1;
	return mul$1(n, fact$1(sub$1(n, ONE$1)));
};
//#endregion
//#region src/bigfloat.ts
/**
* Represents an arbitrary-precision floating point number.
*
* A BigFloat consists of a `coefficient` (bigint) and an `exponent` (number),
* similar to scientific notation: `coefficient × 10^exponent`.
*/
var BigFloat = class {
	/**
	* The power of 10 applied to the coefficient.
	* @type {number}
	*/
	exponent;
	/**
	* The integer coefficient of the floating-point number.
	* @type {bigint}
	*/
	coefficient;
	/**
	* Creates a new BigFloat instance from a numeric value.
	* @param {Numeric} n - The number to parse into a BigFloat.
	*/
	constructor(n) {
		const { exponent, coefficient } = parse$1(n);
		this.exponent = exponent;
		this.coefficient = coefficient;
	}
	/**
	* Converts the BigFloat to a JSON-compatible string representation.
	* Equivalent to calling {@link BigFloat.toString}.
	* @returns {StringNumericLiteral} A string representation of the BigFloat.
	*/
	toJSON() {
		return this.toString();
	}
	/**
	* Converts the BigFloat to its string representation.
	* @param {number} [radix] - The base/radix for string conversion (e.g. 10 for decimal, 16 for hex).
	* @returns {StringNumericLiteral} A string representation of the BigFloat.
	*/
	toString(radix) {
		return string$1(this, radix);
	}
};
//#endregion
//#region src/constructors.ts
const make = (n) => {
	return new BigFloat(n);
};
/**
* Parses a string or numeric value into a BigFloat instance.
* @param {string | Numeric} n - The value to parse. Can be a numeric string or a Numeric type.
* @returns {BigFloat} A BigFloat representation of the input value.
* @throws {TypeError} If `n` cannot be parsed into a valid numeric value.
*/
const parse = (n) => {
	return new BigFloat(n);
};
/**
* Returns the fractional part of a number.
* @param {Numeric} n - The number to extract the fraction from.
* @returns {BigFloat} The fractional part of `n`.
*/
const fraction = (n) => {
	return make(fraction$1(parse$1(n)));
};
/**
* Returns the integer part of a number.
* @param {Numeric} n - The number to extract the integer part from.
* @returns {BigFloat} The integer part of `n`.
*/
const integer = (n) => {
	return make(integer$1(parse$1(n)));
};
/**
* Converts a number to its standard string representation.
* @param {Numeric} n - The number to convert.
* @returns {StringNumericLiteral} The string representation of `n`.
*/
const string = (n) => {
	return string$1(parse$1(n));
};
const fixed = (n, decimals) => {
	return fixed$1(parse$1(n), decimals);
};
/**
* Converts a number to its scientific notation string representation.
* @param {Numeric} n - The number to convert.
* @returns {StringNumericLiteral} The scientific notation of `n`.
*/
const scientific = (n) => {
	return scientific$1(parse$1(n));
};
//#endregion
//#region src/arithmetic.ts
/**
* Returns the negation of a number.
* @param {Numeric} n - The number to negate.
* @returns {BigFloat} The negated value of `n`.
*/
const neg = (n) => make(neg$1(parse$1(n)));
/**
* Returns the absolute value of a number.
* @param {Numeric} n - The number to get the absolute value of.
* @returns {BigFloat} The absolute value of `n`.
*/
const abs = (n) => make(abs$1(parse$1(n)));
/**
* Adds two or more numbers together.
* @param {Numeric} n - The first addend.
* @param {...Numeric} other - Additional numbers to add.
* @returns {BigFloat} The sum of all arguments.
*/
const add = (n, ...other) => {
	return make(other.map(parse$1).reduce((prev, current) => {
		return add$1(prev, current);
	}, parse$1(n)));
};
/**
* Subtracts numbers from the first number.
* @param {Numeric} n - The initial value.
* @param {...Numeric} other - Numbers to subtract from `n`.
* @returns {BigFloat} The result of the subtraction.
*/
const sub = (n, ...other) => {
	return make(other.map(parse$1).reduce((prev, current) => {
		return sub$1(prev, current);
	}, parse$1(n)));
};
/**
* Multiplies two or more numbers together.
* @param {Numeric} multiplicand - The first number.
* @param {...Numeric} multipliers - Additional numbers to multiply with.
* @returns {BigFloat} The product of all arguments.
*/
const mul = (multiplicand, ...multipliers) => {
	return make(multipliers.map(parse$1).reduce((prev, current) => {
		return mul$1(prev, current);
	}, parse$1(multiplicand)));
};
/**
* Divides one number by another with optional precision.
* @param {Numeric} dividend - The numerator.
* @param {Numeric} divisor - The denominator.
* @param {number} [precision] - Optional precision for the division.
* @returns {BigFloat} The quotient of the division.
*/
const div = (dividend, divisor, precision) => {
	return make(div$1(parse$1(dividend), parse$1(divisor), precision));
};
/**
* Returns the square root of a number.
* @param {Numeric} n - The number to take the square root of.
* @returns {BigFloat} The square root of `n`.
*/
const sqrt = (n) => make(sqrt$1(parse$1(n)));
/**
* Rounds a number up to the nearest integer or given precision.
* @param {Numeric} n - The number to round up.
* @param {number} [precision=0] - The decimal precision to round to.
* @param {number} [divisorPrecision] - Optional precision for internal division.
* @returns {BigFloat} The rounded-up value.
*/
const ceil = (n, precision = 0, divisorPrecision) => {
	const divisor = parse$1(Math.pow(10, precision));
	return make(div$1(ceil$1(mul$1(parse$1(n), divisor)), divisor, divisorPrecision));
};
/**
* Rounds a number down to the nearest integer or given precision.
* @param {Numeric} n - The number to round down.
* @param {number} [precision=0] - The decimal precision to round to.
* @param {number} [divisorPrecision] - Optional precision for internal division.
* @returns {BigFloat} The rounded-down value.
*/
const floor = (n, precision = 0, divisorPrecision) => {
	const divisor = parse$1(Math.pow(10, precision));
	return make(div$1(floor$1(mul$1(parse$1(n), divisor)), divisor, divisorPrecision));
};
/**
* Rounds a number to the nearest integer or given precision.
* Similar to `Math.round`, but supports arbitrary-precision numbers (`BigFloat`).
* @param {Numeric} n - The number to round.
* @param {number} [precision=0] - The decimal precision to round to.
* For example, `precision = 2` rounds to the nearest hundredth.
* @param {number} [divisorPrecision] - Optional precision for internal division operations.
* @returns {BigFloat} The number rounded to the specified precision.
*/
const round = (n, precision = 0, divisorPrecision) => {
	const divisor = parse$1(Math.pow(10, precision));
	return make(div$1(round$1(mul$1(parse$1(n), divisor)), divisor, divisorPrecision));
};
/**
* Raises a number to a given power.
* @param {Numeric} base - The base number.
* @param {Numeric} exp - The exponent.
* @returns {BigFloat} The result of `base^exp`.
*/
const pow = (base, exp) => {
	return make(pow$1(parse$1(base), parse$1(exp)));
};
/**
* Computes the factorial of a number.
* @param {Numeric} n - The number to compute the factorial for.
* @returns {BigFloat} The factorial of `n`.
*/
const fact = (n) => {
	return make(fact$1(parse$1(n)));
};
//#endregion
//#region src/constants.ts
const ZERO = /* @__PURE__ */ new BigFloat(0);
const ONE = /* @__PURE__ */ new BigFloat(1);
const TWO = /* @__PURE__ */ new BigFloat(2);
const THREE = /* @__PURE__ */ new BigFloat(3);
const FOUR = /* @__PURE__ */ new BigFloat(4);
const FIVE = /* @__PURE__ */ new BigFloat(5);
const SIX = /* @__PURE__ */ new BigFloat(6);
const SEVEN = /* @__PURE__ */ new BigFloat(7);
const EIGHT = /* @__PURE__ */ new BigFloat(8);
const NINE = /* @__PURE__ */ new BigFloat(9);
const TEN = /* @__PURE__ */ new BigFloat(10);
const HUNDRED = /* @__PURE__ */ new BigFloat(100);
const THOUSAND = /* @__PURE__ */ new BigFloat(1e3);
const MILLION = /* @__PURE__ */ new BigFloat(1e6);
const BILLION = /* @__PURE__ */ new BigFloat(1e9);
const TRILLION = /* @__PURE__ */ new BigFloat(1000000000000n);
const QUADRILLION = /* @__PURE__ */ new BigFloat(1000000000000000n);
const QUINTILLION = /* @__PURE__ */ new BigFloat(1000000000000000000n);
const SEXTILLION = /* @__PURE__ */ new BigFloat(1000000000000000000000n);
const SEPTILLION = /* @__PURE__ */ new BigFloat(1000000000000000000000000n);
//#endregion
//#region src/predicates.ts
/**
* Checks whether a value is an instance of BigFloat.
* @param {unknown} n - The value to check.
* @returns {n is BigFloat} True if the value is a BigFloat, otherwise false.
*/
const isBigFloat = (n) => {
	return n instanceof BigFloat;
};
/**
* Checks whether a number is an integer.
* @param {Numeric} n - The number to check.
* @returns {boolean} True if `n` is an integer, otherwise false.
*/
const isInteger = (n) => {
	return isInteger$1(parse$1(n));
};
/**
* Checks whether a number is strictly less than zero.
* @param {Numeric} n - The number to check.
* @returns {boolean} True if `n` is negative, otherwise false.
*/
const isNegative = (n) => {
	return isNegative$1(parse$1(n));
};
/**
* Checks whether a number is strictly greater than zero.
* @param {Numeric} n - The number to check.
* @returns {boolean} True if `n` is positive, otherwise false.
*/
const isPositive = (n) => {
	return isPositive$1(parse$1(n));
};
/**
* Checks whether a number is equal to zero.
* @param {Numeric} n - The number to check.
* @returns {boolean} True if `n` is zero, otherwise false.
*/
const isZero = (n) => {
	return isZero$1(parse$1(n));
};
//#endregion
//#region src/relational.ts
/**
* Checks whether two numbers are equal.
* @param {Numeric} a - The first number.
* @param {Numeric} b - The second number.
* @returns {boolean} True if `a` and `b` are equal, otherwise false.
*/
const eq = (a, b) => eq$1(parse$1(a), parse$1(b));
/**
* Checks whether the first number is less than the second.
* @param {Numeric} a - The first number.
* @param {Numeric} b - The second number.
* @returns {boolean} True if `a < b`, otherwise false.
*/
const lt = (a, b) => lt$1(parse$1(a), parse$1(b));
/**
* Checks whether the first number is less than or equal to the second.
* @param {Numeric} a - The first number.
* @param {Numeric} b - The second number.
* @returns {boolean} True if `a <= b`, otherwise false.
*/
const lte = (a, b) => lte$1(parse$1(a), parse$1(b));
/**
* Checks whether the first number is greater than the second.
* @param {Numeric} a - The first number.
* @param {Numeric} b - The second number.
* @returns {boolean} True if `a > b`, otherwise false.
*/
const gt = (a, b) => gt$1(parse$1(a), parse$1(b));
/**
* Checks whether the first number is greater than or equal to the second.
* @param {Numeric} a - The first number.
* @param {Numeric} b - The second number.
* @returns {boolean} True if `a >= b`, otherwise false.
*/
const gte = (a, b) => gte$1(parse$1(a), parse$1(b));
/**
* Compares two numbers and returns their ordering.
* @param {Numeric} a - The first number.
* @param {Numeric} b - The second number.
* @returns {1 | -1 | 0} `1` if `a > b`, `-1` if `a < b`, `0` if they are equal.
*/
const cmp = (a, b) => {
	if (gt(a, b)) return 1;
	else if (lt(a, b)) return -1;
	return 0;
};
/**
* Returns the smallest of the given numbers.
* @param {...Numeric} numbers - The numbers to compare.
* @returns {BigFloat} The minimum value.
*/
const min = (...numbers) => {
	return make(min$1(...numbers.map((v) => parse$1(v))));
};
/**
* Returns the largest of the given numbers.
* @param {...Numeric} numbers - The numbers to compare.
* @returns {BigFloat} The maximum value.
*/
const max = (...numbers) => {
	return make(max$1(...numbers.map((v) => parse$1(v))));
};
/**
* Clamps a number between a minimum and maximum bound.
* @param {Numeric} number - The number to clamp.
* @param {Numeric} min - The minimum allowed value.
* @param {Numeric} max - The maximum allowed value.
* @returns {BigFloat} `number` constrained to the range `[min, max]`.
*/
const clamp = (number, min, max) => {
	return make(clamp$1(parse$1(number), parse$1(min), parse$1(max)));
};
//#endregion
export { BILLION, BigFloat, EIGHT, FIVE, FOUR, HUNDRED, MILLION, NINE, ONE, PRECISION, QUADRILLION, QUINTILLION, SEPTILLION, SEVEN, SEXTILLION, SIX, TEN, THOUSAND, THREE, TRILLION, TWO, ZERO, abs, add, ceil, clamp, cmp, div, eq, fact, fixed, floor, fraction, gt, gte, integer, isBigFloat, isInteger, isNegative, isPositive, isZero, lt, lte, make, max, min, mul, neg, parse, pow, round, scientific, setPrecision, sqrt, string, sub };
