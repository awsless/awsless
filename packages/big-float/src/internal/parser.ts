import type { IBigFloat, Numeric } from '../type.js'
import { isBigFloatLike } from './predicates.js'

export const parse = (a: Numeric): IBigFloat => {
	if (typeof a === 'bigint') {
		return { coefficient: a, exponent: 0 }
	} else if (typeof a === 'string' || typeof a === 'number') {
		// if(typeof a === 'string') {
		// 	const low = a.toLowerCase()
		// 	if(a.startsWith('0o')) {
		// 		throw new
		// 	}
		// }

		const number_pattern = /^(-?\d+)(?:\.(\d*))?(?:e([\-\+]?\d+))?$/i
		const parts = String(a).match(number_pattern)

		if (parts) {
			const frac = parts[2] ?? ''

			return {
				coefficient: BigInt(parts[1] + frac),
				exponent: Number(parts[3] ?? 0) - frac.length,
			}
		}
	} else if (isBigFloatLike(a)) {
		return a
	}

	throw new TypeError('Invalid BigFloat')
}
