import type { IBigFloat, Numeric } from '../type.js'
import { make } from './constructors.js'
import { isBigFloatLike } from './predicates.js'

export const parse = (a: Numeric): IBigFloat => {
	if (typeof a === 'bigint') {
		return make(a, 0)
	} else if (typeof a === 'string' || typeof a === 'number') {
		const number_pattern = /^(-?\d+)(?:\.(\d*))?(?:e([-+]?\d+))?$/i
		const parts = String(a).match(number_pattern)

		if (parts) {
			const frac = parts[2] ?? ''

			return make(BigInt(parts[1] + frac), Number(parts[3] ?? 0) - frac.length)
		}
	} else if (isBigFloatLike(a)) {
		return a
	}

	throw new TypeError('Invalid BigFloat')
}
