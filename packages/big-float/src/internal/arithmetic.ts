import { PRECISION } from '../percision'
import { IBigFloat } from '../type'
import { EPSILON, NEG_ONE, ONE, TWO, ZERO } from './constants'
import { integer, make, number } from './constructors'
import { isInteger, isNegative, isZero } from './predicates'
import { eq, gt, lt } from './relational'

const conformOp = (op: (a: bigint, b: bigint) => bigint) => {
	return (a: IBigFloat, b: IBigFloat): IBigFloat => {
		const differential = a.exponent - b.exponent

		if (differential === 0) {
			return make(op(a.coefficient, b.coefficient), a.exponent)
		}

		if (differential > 0) {
			return make(op(a.coefficient * 10n ** BigInt(differential), b.coefficient), b.exponent)
		}

		return make(op(a.coefficient, b.coefficient * 10n ** BigInt(-differential)), a.exponent)
	}
}

export const add = conformOp((a, b) => a + b)
export const sub = conformOp((a, b) => a - b)

export const neg = (a: IBigFloat): IBigFloat => {
	return make(-a.coefficient, a.exponent)
}

export const abs = (a: IBigFloat): IBigFloat => {
	return isNegative(a) ? neg(a) : a
}

export const mul = (multiplicand: IBigFloat, multiplier: IBigFloat): IBigFloat => {
	return make(multiplicand.coefficient * multiplier.coefficient, multiplicand.exponent + multiplier.exponent)
}

// export const div = (dividend: IBigFloat, divisor: IBigFloat, precision: number = PRECISION): IBigFloat => {
// 	if (isZero(divisor)) {
// 		throw new TypeError('Divide by zero')
// 	}

// 	if (isZero(dividend)) {
// 		return ZERO
// 	}

// 	if (!Number.isInteger(precision) || precision < 0) {
// 		throw new TypeError('Only positive integers are allowed for precision')
// 	}

// // Special case for precision = 0: integer division (truncation towards zero)
// if (precision === 0) {
// 	return integer(div(dividend, divisor, 10)) // Use some precision then truncate
// }

// 	const p = -precision

// 	let { coefficient, exponent } = dividend
// 	exponent -= divisor.exponent

// 	if (exponent > p) {
// 		coefficient = coefficient * 10n ** BigInt(exponent - p)
// 		exponent = p
// 	}

// 	return make(coefficient / divisor.coefficient, exponent)
// }

export const div = (dividend: IBigFloat, divisor: IBigFloat, precision: number = PRECISION): IBigFloat => {
	if (isZero(divisor)) {
		throw new TypeError('Divide by zero')
	}

	if (isZero(dividend)) {
		return ZERO
	}

	if (!Number.isInteger(precision) || precision < 0) {
		throw new TypeError('Only positive integers are allowed for precision')
	}

	// Special case for precision = 0: integer division (truncation towards zero)
	if (precision === 0) {
		return integer(div(dividend, divisor, 10)) // Use some precision then truncate
	}

	// Calculate with one extra digit for rounding
	const extraPrecision = 1
	const totalPrecision = precision + extraPrecision
	const p = -totalPrecision

	let { coefficient, exponent } = dividend
	exponent -= divisor.exponent

	if (exponent > p) {
		coefficient = coefficient * 10n ** BigInt(exponent - p)
		exponent = p
	}

	const quotient = coefficient / divisor.coefficient

	// Round to the requested precision using proper rounding
	const isNegativeResult = quotient < 0n
	const absQuotient = isNegativeResult ? -quotient : quotient
	const roundedAbsQuotient = (absQuotient + 5n) / 10n
	const roundedQuotient = isNegativeResult ? -roundedAbsQuotient : roundedAbsQuotient
	const finalExponent = exponent + extraPrecision

	return make(roundedQuotient, finalExponent)
}

// export const sqrt = (n: IBigFloat): IBigFloat => {
// if (isZero(n)) {
// 	return ZERO
// }

// if (eq(n, ONE)) {
// 	return ONE
// }
// 	let x: IBigFloat = n
// 	let y: IBigFloat = ONE

// 	while (gt(sub(x, y), EPSILON)) {
// 		x = div(add(x, y), TWO)
// 		y = div(n, x)
// 	}

// 	return x
// }

export const sqrt = (n: IBigFloat): IBigFloat => {
	if (isZero(n)) {
		return ZERO
	}

	if (eq(n, ONE)) {
		return ONE
	}

	if (isNegative(n)) {
		throw new TypeError('No square root')
	}

	// Use a much better initial guess based on bit length approximation
	let x: IBigFloat
	const coeffStr = n.coefficient.toString()
	const bitLength = coeffStr.length + n.exponent

	if (bitLength > 0) {
		// For large numbers, use a power-of-10 based initial guess
		const halfBitLength = Math.floor(bitLength / 2)
		x = make(10n ** BigInt(Math.max(0, halfBitLength - 1)), 0)
	} else {
		// For small numbers, start with the number itself
		x = n
	}

	let prev: IBigFloat
	let iterations = 0
	const maxIterations = 100 // Reduced max iterations

	do {
		prev = x
		// Newton's method: x = (x + n/x) / 2
		x = div(add(x, div(n, x)), TWO)
		iterations++

		// Early termination if convergence is very slow
		if (iterations > 10) {
			const diff = abs(sub(x, prev))
			if (gt(diff, div(abs(x), make(1000n, 0)))) {
				// If we're not converging fast enough, break
				break
			}
		}
	} while (gt(abs(sub(x, prev)), EPSILON) && iterations < maxIterations)

	return x
}

export const pow = (base: IBigFloat, exp: IBigFloat): IBigFloat => {
	if (eq(exp, ZERO)) {
		return ONE
	}

	if (isNegative(exp)) {
		return div(ONE, pow(base, abs(exp)))
	}

	if (exp.exponent === 0) {
		let result = base
		let n = 1
		while (n !== number(exp)) {
			result = mul(result, base)
			n += 1
		}
		return result
	}

	if (gt(exp, ONE) || eq(exp, ONE)) {
		const temp = pow(base, div(exp, TWO))
		return mul(temp, temp)
	}

	let low: IBigFloat = ZERO
	let high: IBigFloat = ONE

	let sqr = sqrt(base)
	let acc = sqr
	let mid = div(high, TWO)

	while (gt(abs(sub(mid, exp)), EPSILON)) {
		sqr = sqrt(sqr)

		if (lt(mid, exp) || eq(mid, exp)) {
			low = mid
			acc = mul(acc, sqr)
		} else {
			high = mid
			acc = mul(acc, div(ONE, sqr))
		}
		mid = div(add(low, high), TWO)
	}
	return acc
}

export const ceil = (n: IBigFloat): IBigFloat => {
	if (isInteger(n)) {
		return n
	} else {
		return make(integer(n).coefficient + 1n, 0)
	}
}

export const floor = (n: IBigFloat): IBigFloat => {
	return integer(n)
}

export const round = (n: IBigFloat): IBigFloat => {
	// If exponent >= 0, the number is already an integer or larger, no fractional part
	if (n.exponent >= 0) {
		return n
	}

	// Number of digits to remove from the coefficient
	const factor = 10n ** BigInt(-n.exponent)

	if (isNegative(n)) {
		return make((n.coefficient - factor / 2n) / factor, 0)
	}

	return make((n.coefficient + factor / 2n) / factor, 0)
}

export const fact = (n: IBigFloat): IBigFloat => {
	if (lt(n, ZERO)) {
		return mul(NEG_ONE, fact(mul(n, NEG_ONE)))
	}

	if (eq(n, ZERO) || eq(n, ONE)) {
		return ONE
	}

	return mul(n, fact(sub(n, ONE)))
}
