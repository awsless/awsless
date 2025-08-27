import { fraction as a_fraction, integer as a_integer, scientific as a_scientific } from 'bigfloat-esnext'
import { BigFloat, make, Numeric } from './bigfloat'

export const scientific = (number: Numeric): string => {
	return a_scientific(make(number))
}

export const fraction = (number: Numeric) => {
	return new BigFloat(a_fraction(make(number)))
}

export const integer = (number: Numeric) => {
	return new BigFloat(a_integer(make(number)))
}
