export { bigfloat, positive, precision } from './types/bigfloat.js'
export { date } from './types/date.js'
export { uuid } from './types/uuid.js'
export { json } from './types/json.js'
export { lowercase, uppercase } from './types/string.js'
export { unique } from './types/array.js'

export {
	// -------------------------------------------------------------------------
	// coercions
	coerce,
	defaulted,
	trimmed,

	// -------------------------------------------------------------------------
	// refinements
	empty,
	max,
	min,
	nonempty,
	pattern,
	size,
	refine,

	// -------------------------------------------------------------------------
	// types
	any,
	array,
	bigint,
	boolean,
	enums,
	func,
	instance,
	integer,
	intersection,
	literal,
	map,
	never,
	nullable,
	number,
	object,
	optional,
	record,
	regexp,
	set,
	string,
	tuple,
	type,
	union,
	unknown,

	// -------------------------------------------------------------------------
	// utilities
	assign,
	define,
	deprecated,
	dynamic,
	lazy,
	omit,
	partial,
	pick,
	struct,

	// -------------------------------------------------------------------------
	// struct
	assert,
	create,
	mask,
	is,
	Struct,

	// -------------------------------------------------------------------------
	// error
	StructError,
} from 'superstruct'

export type { Context, Infer, Describe, Result, Coercer, Validator, Refiner, Failure } from 'superstruct'
