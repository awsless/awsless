export { BigFloat, Numeric } from './bigfloat.js'
export type { IBigFloat } from 'bigfloat-esnext'

export { neg, abs, add, sub, mul, div, sqrt, pow, ceil, floor, factor } from './arithmetic.js'
export { eq, lt, lte, gt, gte, min, max, minmax } from './relational.js'

export {
	set_precision,
	evaluate,

	// constructors
	scientific,
	fraction,

	// predicates
	is_big_float,
	is_number,
	is_negative,
	is_positive,
	is_zero,
	is_integer,
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
