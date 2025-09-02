import { IBigFloat, Numeric } from '../type.js'
import { integer } from './constructors.js'
import { eq } from './relational.js'

export const isBigFloatLike = (n: Numeric): n is IBigFloat => {
	return (
		typeof n === 'object' &&
		'coefficient' in n &&
		typeof n.coefficient === 'bigint' &&
		'exponent' in n &&
		typeof n.exponent === 'number' &&
		Number.isSafeInteger(n.exponent)
	)
}

// export const isNumber = (token: string): boolean => {
// 	return !Number.isNaN(Number(token))
// }

export const isNegative = (big: IBigFloat): boolean => {
	return big.coefficient < 0n
}

export const isPositive = (big: IBigFloat): boolean => {
	return big.coefficient > 0n
}

export const isZero = (big: IBigFloat): boolean => {
	return big.coefficient === 0n
}

export const isInteger = (big: IBigFloat): boolean => {
	return eq(big, integer(big))
}
