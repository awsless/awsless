
import {
	make,
	eq as a_eq,
	lt as a_lt,
	lte as a_lte,
	gt as a_gt,
	gte as a_gte,
} from 'bigfloat-esnext'

import { BigFloat, Numeric } from './bigfloat.js'

export const eq = (a:Numeric, b:Numeric) => a_eq(make(a), make(b))
export const lt = (a:Numeric, b:Numeric) => a_lt(make(a), make(b))
export const lte = (a:Numeric, b:Numeric) => a_lte(make(a), make(b))
export const gt = (a:Numeric, b:Numeric) => a_gt(make(a), make(b))
export const gte = (a:Numeric, b:Numeric) => a_gte(make(a), make(b))

export const min = (...values:Numeric[]) => {
	return new BigFloat(values.reduce((prev, current) => {
		return lt(prev, current) ? prev : current
	}))
}

export const max = (...values:Numeric[]) => {
	return new BigFloat(values.reduce((prev, current) => {
		return gt(prev, current) ? prev : current
	}))
}
