
import {
	make,
	eq as a_eq,
	lt as a_lt,
	lte as a_lte,
	gt as a_gt,
	gte as a_gte,
} from 'bigfloat-esnext'

import { Numeric } from './bigfloat.js'

export const eq = (a:Numeric, b:Numeric) => a_eq(make(a), make(b))
export const lt = (a:Numeric, b:Numeric) => a_lt(make(a), make(b))
export const lte = (a:Numeric, b:Numeric) => a_lte(make(a), make(b))
export const gt = (a:Numeric, b:Numeric) => a_gt(make(a), make(b))
export const gte = (a:Numeric, b:Numeric) => a_gte(make(a), make(b))
