import type { IBigFloat, Numeric } from '../type.js'
import { sub } from './arithmetic.js'
import { isNegative, isZero } from './predicates.js'

export const number = (a: Numeric): number => {
	if (typeof a === 'number') {
		return a
	}

	if (typeof a === 'string' || typeof a === 'bigint') {
		return Number(a)
	}

	return a.exponent === 0 ? Number(a.coefficient) : Number(a.coefficient) * 10 ** a.exponent
}

export const normalize = (a: IBigFloat): IBigFloat => {
	let { coefficient, exponent } = a

	// If the exponent is zero, it is already normal.
	if (exponent !== 0) {
		if (exponent > 0) {
			coefficient = coefficient * 10n ** BigInt(exponent)
			exponent = 0
		} else {
			while (exponent <= -7) {
				const remainder = coefficient % 10_000_000n
				if (remainder !== 0n) {
					break
				}
				coefficient = coefficient / 10_000_000n
				exponent += 7
			}

			while (exponent < 0) {
				const remainder = coefficient % 10n
				if (remainder !== 0n) {
					break
				}
				coefficient = coefficient / 10n
				exponent += 1
			}
		}
	}

	return { coefficient, exponent }
}

// The integer function is like the normalize function except that it throws
// away significance. It discards the digits after the decimal point.
export const integer = (a: IBigFloat): IBigFloat => {
	const { coefficient, exponent } = a

	// If the exponent is zero, it is already an integer.
	if (exponent === 0) {
		return a
	}

	// If the exponent is positive,
	// multiply the coefficient by 10 ** exponent.
	if (exponent > 0) {
		return make(coefficient * 10n ** BigInt(exponent), 0)
	}

	// If the exponent is negative, divide the coefficient by 10 ** -exponent.
	// This truncates the unnecessary bits. This might be a zero result.
	return make(coefficient / 10n ** BigInt(-exponent), 0)
}

export const fraction = (a: IBigFloat): IBigFloat => {
	return sub(a, integer(a))
}

export const make = (coefficient: bigint, exponent: number): IBigFloat => {
	const bigfloat = { coefficient, exponent }
	Object.freeze(bigfloat)

	return bigfloat
}

export const string = (a: IBigFloat, radix?: number): string => {
	if (isZero(a)) {
		return '0'
	}

	if (radix) {
		return integer(a).coefficient.toString(radix)
	}

	a = normalize(a)

	const isNeg = isNegative(a)
	let s = (isNeg ? -a.coefficient : a.coefficient).toString()

	if (a.exponent < 0) {
		let point = s.length + a.exponent
		if (point <= 0) {
			s = '0'.repeat(1 - point) + s
			point = 1
		}
		s = s.slice(0, point) + '.' + s.slice(point)
	} else if (a.exponent > 0) {
		s += '0'.repeat(a.exponent)
	}

	if (isNeg) {
		s = '-' + s
	}

	return s
}

// export const scientific = (a: IBigFloat): string => {
// 	if (isZero(a)) {
// 		return '0'
// 	}

// 	a = normalize(a)

// 	const isNeg = isNegative(a)
// 	let s = String(isNeg ? -a.coefficient : a.coefficient)
// 	const e = a.exponent + s.length - 1

// 	if (s.length > 1) {
// 		s = s.slice(0, 1) + '.' + s.slice(1)
// 	}

// 	if (e !== 0) {
// 		s += 'e' + e
// 	}

// 	if (isNeg) {
// 		s = '-' + s
// 	}

// 	return s
// }

export const scientific = (a: IBigFloat): string => {
	if (isZero(a)) {
		return '0'
	}

	a = normalize(a)

	const isNeg = isNegative(a)
	let s = String(isNeg ? -a.coefficient : a.coefficient)
	const e = a.exponent + s.length - 1

	if (s.length > 1) {
		// Remove trailing zeros from the fractional part
		let fractionalPart = s.slice(1)
		fractionalPart = fractionalPart.replace(/0+$/, '')

		if (fractionalPart.length > 0) {
			s = s.slice(0, 1) + '.' + fractionalPart
		} else {
			s = s.slice(0, 1)
		}
	}

	if (e !== 0) {
		s += 'e' + e
	}

	if (isNeg) {
		s = '-' + s
	}

	return s
}
