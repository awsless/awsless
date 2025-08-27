import { IBigFloat, make as a_make, set_precision, string } from 'bigfloat-esnext'

set_precision(-12)

export type Numeric = IBigFloat | number | bigint | string

export const make = (number: Numeric) => {
	if (typeof number === 'string') {
		const lower = number.toLowerCase()

		if (lower.includes('e')) {
			if (lower.includes('+')) {
				return a_make(lower.replaceAll('+', ''))
			}

			return a_make(lower)
		}
	}

	return a_make(number)
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
