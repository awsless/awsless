import { AnySchema, AttributeType, Expression } from '../schema/schema'
import {
	BinaryConditionExpression,
	BooleanConditionExpression,
	ListConditionExpression,
	MapConditionExpression,
	NumberConditionExpression,
	SetConditionExpression,
	StringConditionExpression,
	UnknownConditionExpression,
} from './condition'
import {
	BinaryUpdateExpression,
	BooleanUpdateExpression,
	ListUpdateExpression,
	MapUpdateExpression,
	NumberUpdateExpression,
	SetUpdateExpression,
	StringUpdateExpression,
	UnknownUpdateExpression,
} from './update'

// ------------------------------------------------------------
// Helpers

type Without<T, U> = { [K in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = (T & Without<U, T>) | (U & Without<T, U>)

type FilterNever<T extends any[]> = T extends [infer Head, ...infer Tail]
	? [Head] extends [never]
		? FilterNever<Tail>
		: [Head, ...FilterNever<Tail>]
	: []

export type OneOf<T extends Record<string, any>[]> =
	FilterNever<T> extends [infer A extends Record<string, any>, ...infer B extends Record<string, any>[]]
		? B['length'] extends 0
			? A
			: XOR<A, OneOf<B>>
		: never

// ------------------------------------------------------------
// Update Expression Functions

export type SetFunction<T> = {
	/** Set attribute value. */
	$set: T
}

export type SetIfNotExistFunction<T> = undefined extends T
	? {
			/** Set the attribute value if the attribute doesn't already exists. */
			$setIfNotExists: T
		}
	: never

export type SetPartialFunction<T> = {
	/** ... */
	$setPartial: Partial<T>
}

export type DeleteFunction<T> = undefined extends T
	? {
			/** Delete attribute value. */
			$delete: true
		}
	: never

export type PushFunction<T> = {
	/** Push elements to the end of a array. */
	$push: T
}

export type IncrementFunction<T> = {
	/** Increment a numeric value. */
	$incr: T

	/** Default value for when the attribute doesn't exist. */
	$default?: T
}

export type DecrementFunction<T> = {
	/** Decrement a numeric value. */
	$decr: T

	/** Default value for when the attribute doesn't exist. */
	$default?: T
}

export type AppendFunction<T> = {
	/** Append elements to a Set. */
	$append: T
}

export type RemoveFunction<T> = {
	/** Remove elements from a Set. */
	$remove: T
}

// ------------------------------------------------------------
// Condition & Key Expression Functions

export interface AndFunction<T> {
	/** Check if inner conditions are all `true`. */
	$and: [T, T, ...T[]] | T
}

export interface OrFunction<T> {
	/** Check if atleast one inner conditions is `true`. */
	$or: [T, T, ...T[]] | T
}

export interface NotFunction<T> {
	/** Check if inner condition is `false`. */
	$not: T
}

//

export type EqualFunction<T> = {
	/** Check if the attribute is equal to the specified value. */
	$eq: T
}

export type NotEqualFunction<T> = {
	/** Check if the attribute is not equal to the specified value. */
	$nq: T
}

export type GreaterThanFunction<T> = {
	/** Check if the attribute is greater than the specified value. */
	$gt: T
}

export type GreaterThanOrEqualFunction<T> = {
	/** Check if the attribute is greater than or equal to the specified value. */
	$gte: T
}

export type LessThanFunction<T> = {
	/** Check if the attribute is less than the specified value. */
	$lt: T
}

export type LessThanOrEqualFunction<T> = {
	/** Check if the attribute is less than or equal to the specified value. */
	$lte: T
}

export type BetweenFunction<T> = {
	/** Check if the attribute is greater than or equal to `a`, and is less than or equal to `b`. */
	$between: [T, T]
}

export type InFunction<T> = {
	/** Check if the attribute is equal to any value in the specified list.
	 * The list can contain up to 100 values. */
	$in: [T, ...T[]]
}

export type StartsWithFunction<T> = {
	/** Check if the attribute starts with a particular substring. */
	$startsWith: T
}

export type ContainsFunction<T> = {
	/** Check if the attribute contains the specified value.
	 * - A String that contains a particular substring.
	 * - A Set that contains a particular element within the set.
	 * - A Array that contains a particular element within the list.
	 */
	$contains: T
}

export type ExistsFunction = {
	/** Check if the attribute exists or not. */
	$exists: boolean
}

export type TypeFunction = {
	/** Check if the attribute type is the specified value. */
	$type: AttributeType
}

export type SizeFunction<T> = {
	/** ... */
	$size:
		| EqualFunction<T>
		| NotEqualFunction<T>
		| GreaterThanFunction<T>
		| GreaterThanOrEqualFunction<T>
		| LessThanFunction<T>
		| LessThanOrEqualFunction<T>
		| BetweenFunction<T>
		| InFunction<T>
}

// ------------------------------------------------------------
// Schema Type Expressions

export type StringExpression<T> = Expression<
	//
	StringUpdateExpression<T>,
	StringConditionExpression<T>,
	true
>

export type NumberExpression<T> = Expression<
	//
	NumberUpdateExpression<T>,
	NumberConditionExpression<T>,
	true
>

export type BooleanExpression<T> = Expression<
	//
	BooleanUpdateExpression<T>,
	BooleanConditionExpression<T>,
	true
>

export type BinaryExpression<T> = Expression<
	//
	BinaryUpdateExpression<T>,
	BinaryConditionExpression<T>,
	true
>

export type MapExpression<T, P extends Record<string, AnySchema>> = Expression<
	MapUpdateExpression<T, { [K in keyof P]?: P[K][symbol]['Expression']['Update'] }>,
	MapConditionExpression<T, { [K in keyof P]?: P[K][symbol]['Expression']['Condition'] }>,
	{ [K in keyof P]?: P[K][symbol]['Expression']['Projection'] }
>

// export type RecordExpression<T extends Record<string, any>, S extends AnySchema> = Expression<
// 	// MapUpdateExpression<T, Record<string, S[symbol]['Expression']['Update']>>,
// 	// MapConditionExpression<T, Record<string, S[symbol]['Expression']['Condition']>>,
// 	// Record<string, S[symbol]['Expression']['Projection']>

// 	MapUpdateExpression<T, Record<string, S[symbol]['Expression']['Update']>>,
// 	RecordConditionExpression<T, Record<string, S[symbol]['Expression']['Condition']>>,
// 	Record<string, S[symbol]['Expression']['Projection']>
// >

export type ListExpression<T, L extends AnySchema[]> = Expression<
	ListUpdateExpression<T, { [K in keyof L]?: L[K][symbol]['Expression']['Update'] }>,
	ListConditionExpression<T>,
	{ [K in keyof L]?: L[K][symbol]['Expression']['Projection'] }
>

export type SetExpression<T> = Expression<
	//
	SetUpdateExpression<T>,
	SetConditionExpression<T>,
	true
>

export type UnknownExpression<T> = Expression<
	//
	UnknownUpdateExpression<T>,
	UnknownConditionExpression<T>,
	true
>

export type EnumExpression<T> = Expression<
	//
	UnknownUpdateExpression<T>,
	UnknownConditionExpression<T>,
	true
>
