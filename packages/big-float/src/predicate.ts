import { is_integer, is_negative, is_positive, is_zero, make } from 'bigfloat-esnext'
import { BigFloat, Numeric } from './bigfloat'

export const isBigFloat = (number: unknown) => {
	return number instanceof BigFloat
}

// export const isNumeric = (number: Numeric) => {
// 	return is_big_float(number)
// }

export const isInteger = (number: Numeric) => {
	return is_integer(make(number))
}

export const isNegative = (number: Numeric) => {
	return is_negative(make(number))
}

export const isPositive = (number: Numeric) => {
	if (isZero(number)) {
		return false
	}

	return is_positive(make(number))
}

export const isZero = (number: Numeric) => {
	return is_zero(make(number))
}

// export const isNumber = (strval: string) => {
// 	return is_number(strval)
// }
