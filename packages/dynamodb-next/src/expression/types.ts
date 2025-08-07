import { AnySchema, AttributeType, Expression } from '../schema/schema'
import {
	BinaryConditionExpression,
	BooleanConditionExpression,
	JsonConditionExpression,
	ListConditionExpression,
	MapConditionExpression,
	NumberConditionExpression,
	RootConditionExpression,
	SetConditionExpression,
	StringConditionExpression,
	TupleWithRestConditionExpression,
	UnknownConditionExpression,
} from './condition'
import { Fluent } from './fluent'
import {
	BinaryUpdateExpression,
	BooleanUpdateExpression,
	ListUpdateExpression,
	MapUpdateExpression,
	NumberUpdateExpression,
	RootUpdateExpression,
	SetUpdateExpression,
	StringUpdateExpression,
	TupleUpdateExpression,
	TupleWithRestUpdateExpression,
	UnknownUpdateExpression,
} from './update'

// ------------------------------------------------------------
// Helpers

declare const $path: unique symbol

export type Path<A extends AttributeType, T = any> = { [$path]: [A, T] }

// ------------------------------------------------------------
// Update Expression Functions

export type SetFunction<A extends AttributeType, T> = {
	/**
	 * Set the attribute to the provided value.
	 * @param value - The value to assign to the attribute.
	 */
	set(value: T): Fluent
	set(value: Path<A, T>): Fluent
}

export type SetIfNotExistFunction<A extends AttributeType, T> = {
	/**
	 * Set the attribute value only if it does not already exist.
	 * @param value - The value to assign if the attribute is currently undefined.
	 */
	setIfNotExists(value: T): Fluent
	setIfNotExists(value: Path<A, T>): Fluent
}

export type DeleteFunction<T> = undefined extends T
	? {
			/** Delete attribute value. */
			delete(): Fluent
		}
	: {}

export type PushFunction<T extends any[] | undefined, I = NonNullable<T>[number]> = {
	/**
	 * Push one or more elements to the end of the array.
	 * @param {...NonNullable<T>} values - The elements to append to the array.
	 */
	push(...values: [I, ...I[]]): Fluent
	push(...values: [Path<AttributeType, I> | I, ...(Path<AttributeType, I> | I)[]]): Fluent
}

export type IncrementFunction<T, V = NonNullable<T>> = {
	/**
	 * Increment a numeric value.
	 * @param {V} value - The amount to increment by.
	 * @param {V} defaultValue - Default value for when the attribute doesn't exist.
	 */
	incr(value: V, defaultValue?: V): Fluent
	incr(value: Path<'N'> | V, defaultValue?: Path<'N'> | V): Fluent
}

export type DecrementFunction<T, V = NonNullable<T>> = {
	/**
	 * Decrement a numeric value.
	 * @param {V} value - The amount to decrement by.
	 * @param {V} defaultValue - Default value for when the attribute doesn't exist.
	 */
	decr(value: V, defaultValue?: V): Fluent
	decr(value: Path<'N'> | V, defaultValue?: Path<'N'> | V): Fluent
}

export type AppendFunction<A extends AttributeType, T, V = NonNullable<T>> = {
	/**
	 * Append elements to a Set.
	 * @param {V} value - The elements to add to the Set.
	 */
	append(value: V): Fluent
	append(value: Path<A, T>): Fluent
}

export type RemoveFunction<A extends AttributeType, T, V = NonNullable<T>> = {
	/**
	 * Remove elements from a Set.
	 * @param {V} value - The elements to remove to the Set.
	 */
	remove(value: V): Fluent
	remove(value: Path<A, T>): Fluent
}

// ------------------------------------------------------------
// Condition & Key Expression Functions

export type AndFunction = {
	/**
	 * Check if all inner conditions evaluate to `true`.
	 * @param conditions - An array of condition expressions.
	 */
	and(conditions: Fluent[]): Fluent
}

export type OrFunction = {
	/**
	 * Check if at least one inner condition evaluates to `true`.
	 * @param conditions - An array of condition expressions.
	 */
	or(conditions: Fluent[]): Fluent
}

export type NotFunction = {
	/**
	 * Check if the given condition evaluates to `false`.
	 * @param condition - A single condition expression to negate.
	 */
	not(condition: Fluent): Fluent
}

export type SizeFunction = {
	/**
	 * Evaluates the size (length or item count) of the given attribute.
	 *
	 * Works with the following attribute types:
	 * - `'S'` (String): Returns the number of UTF-8 bytes in the string.
	 * - `'B'` (Binary): Returns the number of bytes.
	 * - `'L'` (List): Returns the number of elements in the list.
	 * - `'M'` (Map): Returns the number of top-level keys.
	 * - `'SS'` (String Set), `'NS'` (Number Set), `'BS'` (Binary Set): Returns the number of elements in the set.
	 *
	 * @param path - A reference to the attribute whose size should be evaluated.
	 */
	size(path: Path<'S' | 'B' | 'L' | 'M' | 'SS' | 'NS' | 'BS', any>): NumberConditionExpression<number>
}

//
//
//

export type EqualFunction<A extends AttributeType, T> = {
	/**
	 * Check if the attribute is equal to the specified value or another attribute.
	 * @param value - A literal value or reference to another attribute.
	 */
	eq(value: T): Fluent
	eq(value: Path<A>): Fluent
}

export type NotEqualFunction<A extends AttributeType, T> = {
	/**
	 * Check if the attribute is not equal to the specified value or another attribute.
	 * @param value - A literal value or reference to another attribute.
	 */
	nq(value: T): Fluent
	nq(value: Path<A>): Fluent
}

export type GreaterThanFunction<T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute is greater than the specified value or another attribute.
	 * @param value - A literal value or reference to another attribute.
	 */
	gt(value: V): Fluent
	gt(value: Path<'N'>): Fluent
}

export type GreaterThanOrEqualFunction<T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute is greater than or equal to the specified value or another attribute.
	 * @param value - A literal value or reference to another attribute.
	 */
	gte(value: V): Fluent
	gte(value: Path<'N'>): Fluent
}

export type LessThanFunction<T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute is less than the specified value or another attribute.
	 * @param value - A literal value or reference to another attribute.
	 */
	lt(value: V): Fluent
	lt(value: Path<'N'>): Fluent
}

export type LessThanOrEqualFunction<T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute is less than or equal to the specified value or another attribute.
	 * @param value - A literal value or reference to another attribute.
	 */
	lte(value: V): Fluent
	lte(value: Path<'N'>): Fluent
}

export type BetweenFunction<T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute is between two values, inclusive.
	 * @param min - The lower bound (inclusive), can be a value or attribute reference.
	 * @param max - The upper bound (inclusive), can be a value or attribute reference.
	 */
	between(min: V, max: V): Fluent
	between(min: V | Path<'N'>, max: V | Path<'N'>): Fluent
}

export type InFunction<A extends AttributeType, T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute is equal to any value in the specified list.
	 * Can contain up to 100 values.
	 * @param values - A non-empty list of values or attribute references to compare against.
	 */
	in(values: [V, ...V[]]): Fluent
	in(values: [V | Path<A>, ...(V | Path<A>)[]]): Fluent
}

export type StartsWithFunction = {
	/**
	 * Check if the attribute begins with the specified substring or attribute value.
	 * @param search - A string prefix or another attribute.
	 */
	startsWith(search: string): Fluent
	startsWith(search: Path<'S'>): Fluent
}

export type ContainsFunction<A extends AttributeType, T, V = NonNullable<T>> = {
	/**
	 * Check if the attribute contains the specified value.
	 * Works for:
	 * - string - checks if a substring is present.
	 * - array - checks if an element exists in the list.
	 * - set - checks if an element exists in the set.
	 * @param value - The value or attribute to search for.
	 */
	contains(value: V): Fluent
	contains(value: Path<A>): Fluent
}

export type ExistsFunction = {
	/**
	 * Check if the attribute exists.
	 */
	exists(): Fluent
}

export type NotExistsFunction = {
	/**
	 * Check if the attribute does not exist.
	 */
	notExists(): Fluent
}

export type TypeFunction<A extends AttributeType> = {
	/**
	 * Check if the attribute is of the specified DynamoDB type.
	 * @param value - The expected DynamoDB type, such as `"S"`, `"N"`, `"BOOL"`, etc.
	 */
	type(value: A): Fluent
}

// export type SizeFunction<T> = {
// 	/** ... */
// 	$size:
// 		| EqualFunction<T>
// 		| NotEqualFunction<T>
// 		| GreaterThanFunction<T>
// 		| GreaterThanOrEqualFunction<T>
// 		| LessThanFunction<T>
// 		| LessThanOrEqualFunction<T>
// 		| BetweenFunction<T>
// 		| InFunction<T>
// }

// ------------------------------------------------------------
// Schema Type Expressions

export type StringExpression<T> = Expression<
	//
	StringUpdateExpression<T>,
	StringConditionExpression<T>
>

export type NumberExpression<T> = Expression<
	//
	NumberUpdateExpression<T>,
	NumberConditionExpression<T>
>

export type BooleanExpression<T> = Expression<
	//
	BooleanUpdateExpression<T>,
	BooleanConditionExpression<T>
>

export type BinaryExpression<T> = Expression<
	//
	BinaryUpdateExpression<T>,
	BinaryConditionExpression<T>
>

export type JsonExpression<T> = Expression<
	//
	StringUpdateExpression<T>,
	JsonConditionExpression<T>
>

export type MapExpression<
	T,
	P extends Record<string, AnySchema>,
	P_UPDATE extends Record<string, any> = { [K in keyof P]: P[K][symbol]['Expression']['Update'] },
	P_CONDITION extends Record<string, any> = { [K in keyof P]: P[K][symbol]['Expression']['Condition'] },
> = Expression<
	MapUpdateExpression<T, P_UPDATE>,
	MapConditionExpression<T, P_CONDITION>,
	RootUpdateExpression<T, P_UPDATE>,
	RootConditionExpression<P_CONDITION>
>

// export type RecordExpression<T extends Record<string, any>, S extends AnySchema> = Expression<
// 	// MapUpdateExpression<T, Record<string, S[symbol]['Expression']['Update']>>,
// 	// MapConditionExpression<T, Record<string, S[symbol]['Expression']['Condition']>>,
// 	// Record<string, S[symbol]['Expression']['Projection']>

// 	MapUpdateExpression<T, Record<string, S[symbol]['Expression']['Update']>>,
// 	RecordConditionExpression<T, Record<string, S[symbol]['Expression']['Condition']>>,
// 	Record<string, S[symbol]['Expression']['Projection']>
// >

export type ListExpression<T extends any[], L extends AnySchema[]> = Expression<
	ListUpdateExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Update'] }>,
	// ListUpdateExpression<T, L[number][symbol]['Expression']['Update'][]>,
	ListConditionExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Condition'] }>
>

export type TupleExpression<T extends any[], L extends AnySchema[]> = Expression<
	TupleUpdateExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Update'] }>,
	ListConditionExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Condition'] }>
>

export type TupleWithRestExpression<T extends any[], L extends AnySchema[], R extends AnySchema> = Expression<
	TupleWithRestUpdateExpression<
		T,
		{ [K in keyof L]: L[K][symbol]['Expression']['Update'] },
		R[symbol]['Expression']['Update']
	>,
	TupleWithRestConditionExpression<
		T,
		{ [K in keyof L]: L[K][symbol]['Expression']['Condition'] },
		R[symbol]['Expression']['Condition']
	>
>

export type SetExpression<A extends AttributeType, T> = Expression<
	//
	SetUpdateExpression<A, T>,
	SetConditionExpression<A, T>
>

export type UnknownExpression<T> = Expression<
	//
	UnknownUpdateExpression<T>,
	UnknownConditionExpression<T>
>

export type EnumExpression<T> = Expression<
	//
	UnknownUpdateExpression<T>,
	UnknownConditionExpression<T>
>
