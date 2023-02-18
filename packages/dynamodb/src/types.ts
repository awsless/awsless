
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb'
import { Table } from './table'
// import { Object } from 'ts-toolbelt'

// import { Table } from './table'
// import { Object } from 'ts-toolbelt'
// import { Table } from './table'

export interface Options {
	client?: DynamoDBDocumentClient
}

export type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'

export interface MutateOptions extends Options {
	condition?: ExpressionBuilder
	return?: ReturnValues
}

// const lol:ReturnValue = 'NONE'

// export type ExpressionNames = Record<string, string>
// export type ExpressionValues = Record<string, unknown>

// export type Expression = {
// 	expression: string
// 	names: ExpressionNames
// 	values: ExpressionValues
// }

// export type Key = { [ key: string ]: string | number }
export type Name = string
export type Path = string | number
export type Value = NativeAttributeValue
export type Item = Record<Name, Value>
export type Node = Name | Value

export type IDGenerator = () => number

export type BaseTable = Table<Item, keyof Item, keyof Item>

// export type ReturnModelType<I, T> = T extends Table<never, never> ? T extends Table<infer X extends Item> ? X : I : I
// export type ReturnKeyType<T> = T extends Table<never, never> ? T['key'] : Key


export type ConditionFunctionName =
  | 'attribute_exists'
  | 'attribute_not_exists'
  | 'attribute_type'
  | 'begins_with'
  | 'contains'
  | 'size'

// export type ExpressionPaths = Path[][]
export type ExpressionNames = Record<string, Name>
export type ExpressionValues = Record<string, Value>
export type ExpressionBuilder = (gen:IDGenerator, table:Table<Item, keyof Item, keyof Item>) => Expression

// export type Expression = {
// 	query: string
// 	names: ExpressionNames
// 	values: ExpressionValues
// }

export type Expression<
	Names extends ExpressionNames = ExpressionNames,
	Values extends ExpressionValues = ExpressionValues
> = {
	readonly query: string
	readonly names: Names
	readonly values: Values
}

// export type NameExpression<I extends Item, P extends Path[]> = {
// 	readonly query: string
// 	readonly names: ExpressionNames
// 	readonly values: {}
// 	readonly valid: Object.HasPath<I, P, NativeAttributeValue>
// }

export type NameExpression = {
	readonly query: string
	readonly names: ExpressionNames
	readonly values: {}
	readonly type: Value
}

export type ValueExpression<V extends Value> = {
	readonly query: string
	readonly names: {}
	readonly values: { [key: string]: V }
}

// export type ValueExpression<
// 	Names extends ExpressionNames = ExpressionNames,
// 	Values extends ExpressionValues = ExpressionValues
// > = Expression<Names, Values> & {
// 	value: Value
// }

// // <T extends Table<Item, keyof Item>>


// export type ValidExpressionBuilder = <T extends Table<Item, keyof Item>>(gen:IDGenerator) => ValidExpression<T>
// // export type ValidPaths<M extends Item, P extends Paths> =
// export type ValidExpression<
// 	T extends Table<Item, keyof Item>,
// 	Names extends ExpressionNames = ExpressionNames,
// 	Values extends ExpressionValues = ExpressionValues
// > = {
// 	query: string
// 	paths: T['paths'][]
// 	names: Names
// 	values: Values
// }

// export type PathOf<T> =
//   T extends Record<PropertyKey, unknown> ? readonly [keyof T] | readonly [keyof T, ...PathOf<T[keyof T]>]
//   : T extends readonly unknown[] ? readonly [keyof T, ...PathOf<T[keyof T]>]
//   : readonly []

// type PathOf<T> =
//   T extends Record<PropertyKey, unknown> ? readonly [keyof T] | readonly [keyof T, ...PathOf<T[keyof T]>]
//   : T extends readonly unknown[] ? readonly [keyof T, ...PathOf<T[keyof T]>]
//   : readonly []



// interface NextInt {
// 	0: 1
// 	1: 2
// 	2: 3
// 	3: 4
// 	4: 5
// 	[rest: number]: number
// }

// export type PathType<Obj, Path extends Array<string | number>, Index extends number = 0> = {
// 	// Need to use this object indexing pattern to avoid circular reference error.
// 	[Key in Index]: Path[Key] extends undefined
// 		// Return Obj when we reach the end of the Path.
// 		? Obj
// 		// Check if the Key is in the Obj.
// 		: Path[Key] extends keyof Obj
// 			// If the Value does not contain null.
// 			// `T & {}` is a trick to remove undefined from a union type.
// 			? Obj[Path[Key]] extends Obj[Path[Key]] & {}
// 				? PathType<
// 						Obj[Path[Key]],
// 						Path,
// 						Extract<NextInt[Key], number>
// 					>
// 				// Remove the undefined from the Value, and add it to the union after.
// 				: undefined | PathType<
// 						Obj[Path[Key]] & {},
// 						Path,
// 						Extract<NextInt[Key], number>
// 					>
// 			: never
// }[Index]


// export type NestedPaths<
// 	T extends GenericObject,
// 	Prev extends Primitive | undefined = undefined,
// 	Path extends Primitive | undefined = undefined,
// > = {
// 	[K in keyof T]: T[K] extends GenericObject
// 	? NestedPaths<T[K], Union<Prev, Path>, Join<Path, K>>
// 	: Union<Union<Prev, Path>, Join<Path, K>>
// }[keyof T]

// export type DeepKey<
//     T,
//     K extends keyof T = keyof T
// > = K extends string | number
//     ? T[K] extends infer R
//         ? `${K}`| (R extends Record<string, unknown> ? `${K}.${DeepKey<R>}` : never)
//         : never // impossible route
//     : never // impossible route
