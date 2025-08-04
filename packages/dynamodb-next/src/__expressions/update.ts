import { AnyTable } from '../table'
import { ExpressionAttributes } from './attributes'
import {
	AppendFunction,
	DecrementFunction,
	DeleteFunction,
	IncrementFunction,
	OneOf,
	PushFunction,
	RemoveFunction,
	SetFunction,
	SetIfNotExistFunction,
	SetPartialFunction,
} from './types'

// // ------------------------------------------------------------
// // Schema Types

// type BaseSchema<Type, Input = any, Output = any> = {
// 	type: Type
// 	INPUT: Input
// 	OUTPUT: Output
// }

// type AnySchema = BaseSchema<any>

// type BinarySchema = BaseSchema<'B'>
// type StringSchema<T extends string = string> = BaseSchema<'S', T, T>
// type NumberSchema<T extends number = number> = BaseSchema<'N', T, T>
// type BooleanSchema<T extends boolean = boolean> = BaseSchema<'BOOL', T, T>
// type SetSchema<
// 	T extends 'S' | 'N' | 'B' = 'S' | 'N' | 'B',
// 	I extends Set<any> = Set<any>,
// 	O extends Set<any> = Set<any>,
// > = BaseSchema<`S${T}`, I, O>

// type OptionalSchema<T extends AnySchema> = T & {
// 	INPUT: T['INPUT'] | undefined
// 	OUTPUT: T['OUTPUT'] | undefined
// }

// type MapSchema<I = object, O = object, Entries = Record<string, AnySchema>> = BaseSchema<'M', I, O> & {
// 	ENTRIES: Entries
// }

// type ListSchema<I = any[], O = any[], Entry = AnySchema> = BaseSchema<'L', I, O> & {
// 	ENTRY: Entry
// }

// type TupleSchema<I = any[], O = any[], Entry = AnySchema> = BaseSchema<'L', I, O> & {
// 	ENTRY: Entry
// }

// // ------------------------------------------------------------
// // Expression Functions

// type SetFunction<T extends AnySchema> = {
// 	/** Set property value */
// 	$set: T['INPUT']
// }

// type SetIfNotExistFunction<T extends AnySchema> = T['INPUT'] extends undefined
// 	? {
// 			/** Set a value if the attribute doesn't already exists */
// 			$setIfNotExists: T['INPUT']
// 		}
// 	: never

// type SetPartialFunction<T extends AnySchema> = {
// 	/** ... */
// 	$setPartial: Partial<T['INPUT']>
// }

// type DeleteFunction<T extends AnySchema> = T['INPUT'] extends undefined
// 	? {
// 			/** Delete property value */
// 			$delete: true
// 		}
// 	: never

// type PushFunction<T extends ListSchema> = {
// 	/** Push elements to the end of a array. */
// 	$push: T['INPUT']
// }

// type IncrementFunction = {
// 	/** Increment a numeric value */
// 	$incr: number
// 	$default?: number
// }

// type DecrementFunction = {
// 	/** Decrement a numeric value */
// 	$decr: number
// 	$default?: number
// }

// type AppendFunction<T extends SetSchema> = {
// 	/** Append elements to a Set */
// 	$append: T['INPUT']
// }

// type RemoveFunction<T extends SetSchema> = {
// 	/** Remove elements from a Set */
// 	$remove: T['INPUT']
// }

// ------------------------------------------------------------
// Type Expressions

// | ({ [K in keyof P]?: P[K][symbol]['Expression']['Update'] } | SetPartialFunction<I>)
// 		| SetFunction<I>
// 		| SetIfNotExistFunction<I>
// 		| DeleteFunction<I>,

export type MapUpdateExpression<T, R extends Record<string, any>> = OneOf<
	[
		//
		R | SetPartialFunction<T>,
		SetFunction<T>,
		SetIfNotExistFunction<T>,
		DeleteFunction<T>,
	]
>

export type ListUpdateExpression<T, E> = OneOf<
	[
		//
		Record<number, E>,
		SetFunction<T>,
		SetIfNotExistFunction<T>,
		DeleteFunction<T>,
		PushFunction<T>,
	]
>

// export type TupleUpdateExpression<T> = OneOf<
// 	[
// 		//
// 		Record<number, UpdateUpdateExpression<T['ENTRY']>>,
// 		SetFunction<T>,
// 		SetIfNotExistFunction<T>,
// 		DeleteFunction<T>,
// 		PushFunction<T>,
// 	]
// >

export type SetUpdateExpression<T> = OneOf<
	[
		//
		SetFunction<T>,
		SetIfNotExistFunction<T>,
		DeleteFunction<T>,
		AppendFunction<T>,
		RemoveFunction<T>,
	]
>

export type UnknownUpdateExpression<T> = OneOf<[SetFunction<T>, SetIfNotExistFunction<T>, DeleteFunction<T>]>
export type BooleanUpdateExpression<T> = OneOf<[SetFunction<T>, SetIfNotExistFunction<T>, DeleteFunction<T>]>
export type BinaryUpdateExpression<T> = OneOf<[SetFunction<T>, SetIfNotExistFunction<T>, DeleteFunction<T>]>
export type StringUpdateExpression<T> = OneOf<[SetFunction<T>, SetIfNotExistFunction<T>, DeleteFunction<T>]>
export type NumberUpdateExpression<T> = OneOf<
	[SetFunction<T>, SetIfNotExistFunction<T>, DeleteFunction<T>, IncrementFunction<T>, DecrementFunction<T>]
>

// export type UpdateExpression<T extends AnySchema = AnySchema> = T extends MapSchema
// 	? MapExpression<T>
// 	: T extends ListSchema
// 		? ListExpression<T>
// 		: T extends SetSchema
// 			? SetExpression<T>
// 			: T extends StringSchema
// 				? StringExpression<T>
// 				: T extends NumberSchema
// 					? NumberExpression<T>
// 					: T extends BooleanSchema
// 						? BooleanExpression<T>
// 						: T extends BinarySchema
// 							? BinaryExpression<T>
// 							: never

// ------------------------------------------------------------

// type Entries<T> = {
// 	[K in keyof T]: [K, T[K]]
// }[keyof T][]

export type UpdateExpression<T extends AnyTable> = T['schema'][symbol]['Expression']['Update']

const shouldDelete = (value: unknown) => {
	return (
		// undefined value's should be deleted.
		typeof value === 'undefined' ||
		// null value's should be deleted.
		value === null ||
		// empty set's should be deleted.
		(value instanceof Set && value.size === 0)
	)
}

export const buildUpdateExpression = (attrs: ExpressionAttributes, update: object) => {
	const set: string[] = []
	const add: string[] = []
	const rem: string[] = []
	const del: string[] = []

	const find = (object: any, path: string[]) => {
		for (const [key, prop] of Object.entries(object) as [string, any][]) {
			if (key.startsWith('$')) {
				const p = attrs.path(path)

				switch (key) {
					case '$set':
						if (shouldDelete(prop)) {
							rem.push(p)
						} else {
							set.push(`${p} = ${attrs.value(prop, path)}`)
						}
						break

					case '$setIfNotExists':
						if (shouldDelete(prop)) {
							rem.push(p)
						} else {
							set.push(`${p} = if_not_exists(${p}, ${attrs.value(prop, path)})`)
						}
						break

					case '$setPartial':
						for (const [name, value] of Object.entries(prop) as [string, any][]) {
							const local = [...path, name]
							if (shouldDelete(value)) {
								rem.push(attrs.path(local))
							} else {
								set.push(`${attrs.path(local)} = ${attrs.value(value, local)}`)
							}
						}
						break

					case '$setAttribute':
						set.push(`${p} = ${attrs.path(prop)}`)
						break

					case '$delete':
						if (prop === true) {
							rem.push(p)
						}
						break

					case '$push':
						set.push(`${p} = list_append(${p}, ${attrs.value(prop, path)})`)
						break

					case '$incr':
						set.push(
							`${p} = if_not_exists(${p}, ${attrs.value(object.$default ?? 0, path)}) + ${attrs.value(prop, path)}`
						)
						break

					case '$decr':
						set.push(
							`${p} = if_not_exists(${p}, ${attrs.value(object.$default ?? 0, path)}) - ${attrs.value(prop, path)}`
						)
						break

					case '$append':
						add.push(`${p} ${attrs.value(prop, path)}`)
						break

					case '$remove':
						del.push(`${p} ${attrs.value(prop, path)}`)
						break
				}
			} else if (prop.constructor === Object) {
				find(prop, [...path, key])
			}
		}
	}

	find(update, [])

	return (
		[
			['SET', set],
			['ADD', add],
			['REMOVE', rem],
			['DELETE', del],
		] as const
	)
		.filter(([_, entries]) => entries.length)
		.map(([op, entries]) => {
			return `${op} ${entries.join(', ')}`
		})
		.join(' ')
}
