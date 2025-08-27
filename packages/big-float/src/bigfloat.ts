import { IBigFloat, make as a_make, set_precision, string } from 'bigfloat-esnext'

set_precision(-12)

export type Numeric = IBigFloat | number | bigint | string

export const make = (number: Numeric) => {
	return a_make(typeof number === 'string' ? number.toLowerCase() : number)
}

export class BigFloat implements IBigFloat {
	readonly exponent: number
	readonly coefficient: bigint

	constructor(number: Numeric) {
		const { exponent, coefficient } = make(number)

		this.exponent = exponent
		this.coefficient = coefficient
	}

	toJSON() {
		return this.toString()
	}

	toString(radix?: Numeric) {
		if (typeof radix !== 'undefined') {
			radix = make(radix)
		}

		return string(this, radix) as string
	}
}
