import {
	abs as a_abs,
	add as a_add,
	ceil as a_ceil,
	div as a_div,
	eq as a_eq,
	exponentiation as a_exponentiation,
	floor as a_floor,
	lt as a_lt,
	mul as a_mul,
	neg as a_neg,
	sqrt as a_sqrt,
	sub as a_sub,
} from 'bigfloat-esnext'

import { BigFloat, make, Numeric } from './bigfloat.js'

export const neg = (a: Numeric) => new BigFloat(a_neg(make(a)))
export const abs = (a: Numeric) => new BigFloat(a_abs(make(a)))
export const add = (a: Numeric, ...other: Numeric[]) => {
	return new BigFloat(
		other.reduce((prev, current) => {
			return a_add(make(prev), make(current))
		}, a)
	)
}

export const sub = (a: Numeric, ...other: Numeric[]) => {
	return new BigFloat(
		other.reduce((prev, current) => {
			return a_sub(make(prev), make(current))
		}, a)
	)
}

export const mul = (multiplicand: Numeric, ...multipliers: Numeric[]) => {
	return new BigFloat(
		multipliers.reduce((prev, current) => {
			return a_mul(make(prev), make(current))
		}, multiplicand)
	)
}

export const div = (dividend: Numeric, divisor: Numeric, precision?: number) => {
	return new BigFloat(a_div(make(dividend), make(divisor), precision))
}

export const sqrt = (a: Numeric) => new BigFloat(a_sqrt(make(a)))

export const ceil = (a: Numeric, precision: number = 0, divisorPrecision?: number) => {
	const divisor = make(Math.pow(10, precision))
	return new BigFloat(a_div(a_ceil(a_mul(make(a), divisor)), divisor, divisorPrecision))
}
export const floor = (a: Numeric, precision: number = 0, divisorPrecision?: number) => {
	const divisor = make(Math.pow(10, precision))
	return new BigFloat(a_div(a_floor(a_mul(make(a), divisor)), divisor, divisorPrecision))
}

export const pow = (base: Numeric, exp: Numeric) => {
	return new BigFloat(a_exponentiation(make(base), make(exp)))
}

export const factor = (number: Numeric): BigFloat => {
	const value = make(number)
	const ZERO = make(0)

	if (a_lt(value, ZERO)) {
		const NEG_ONE = make(-1)
		return new BigFloat(a_mul(NEG_ONE, factor(a_mul(value, NEG_ONE))))
	}

	const ONE = make(1)
	if (a_eq(value, ZERO) || a_eq(value, ONE)) {
		return new BigFloat(ONE)
	}

	return new BigFloat(a_mul(value, factor(a_sub(value, ONE))))
}
