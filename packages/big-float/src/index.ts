export { BigFloat, Numeric } from './bigfloat.js'
export type { IBigFloat } from 'bigfloat-esnext'

export { neg, abs, add, sub, mul, div, sqrt, pow, ceil, floor, factor } from './arithmetic.js'
export { eq, lt, lte, gt, gte, min, max, minmax, cmp } from './relational.js'
export { isBigFloat, isInteger, isNegative, isPositive, isZero } from './predicate.js'

export {
	set_precision,
	evaluate,

	// constructors
	scientific,
	fraction,
} from 'bigfloat-esnext'

export {
	ZERO,
	ONE,
	TWO,
	THREE,
	FOUR,
	FIVE,
	SIX,
	SEVEN,
	EIGHT,
	NINE,
	TEN,
	HUNDRED,
	THOUSAND,
	MILLION,
	BILLION,
	TRILLION,
} from './constants.js'
