// SOME THINGS TO KNOW BEFORE DIVING IN
/*
	0. DST is the request type, SRC is the response type
	1. Select uses an object because currently is impossible to make recursive types
	2. Select is a recursive type that makes a type based on request type and fields
	3. SelectObject handles object types
*/

type TupleLike = readonly [any, any]
type ArrayLike = any[]
type NeverLike = false | 0
type UnionLike = { __union: any }
type ObjectLike = {}

type Scalar = string | number | boolean | undefined
type Nil = undefined | null
type Anify<T> = { [P in keyof T]?: any }

type FieldsToRemove = '__union' | '__name'

type Optional<T, R> = T extends undefined ? R | undefined : R

export type InferResponse<SRC extends Anify<DST> | undefined, DST> = {
	scalar: SRC
	tuple: Optional<SRC, DST extends TupleLike ? SelectTuple<SRC, DST> : never>
	union: Optional<SRC, SRC extends UnionLike ? SelectUnion<SRC, DST> : never>
	array: Optional<SRC, SRC extends ArrayLike ? SelectArray<SRC, DST> : never>
	object: Optional<SRC, SRC extends ObjectLike ? SelectObject<SRC, DST> : never>
	never: never
}[DST extends Nil
	? 'never'
	: SRC extends Nil
	? 'never'
	: DST extends TupleLike
	? 'tuple'
	: DST extends NeverLike
	? 'never'
	: SRC extends Scalar
	? 'scalar'
	: SRC extends ArrayLike
	? 'array'
	: SRC extends UnionLike
	? 'union'
	: DST extends ObjectLike
	? 'object'
	: 'never']

type SelectTuple<SRC extends Anify<DST>, DST> =
	//
	DST extends readonly [any, infer PAYLOAD]
		? //
		  InferResponse<SRC, PAYLOAD>
		: never

type SelectArray<SRC extends Anify<DST>, DST> =
	//
	SRC extends (infer T)[]
		? //
		  Array<InferResponse<T, DST>>
		: never

// type SelectObject<SRC extends Anify<DST>, DST> = Pick<
// 	{
// 		[Key in keyof SRC]: Key extends keyof DST
// 			? //
// 			  Select<SRC[Key], DST[Key]>
// 			: SRC[Key]
// 	},
// 	Exclude<keyof DST, FieldsToRemove>
// >

type RenameAliases<Object> = {
	[Key in keyof Object as Key extends `${infer Alias}:${string}` ? Alias : Key]: Object[Key]
}
// Key extends `${infer Alias}:${Extract<keyof DST, string>}` ? Alias : Key

type SelectObject<SRC extends Anify<DST>, DST> = RenameAliases<
	Omit<
		{
			[Key in keyof DST]: Key extends keyof SRC
				? //
				  InferResponse<SRC[Key], DST[Key]>
				: SRC[Key]
		},
		FieldsToRemove
	>
>

// type SelectObject<SRC extends Anify<DST>, DST> = Omit<
// 	{
// 		[Key in keyof Optional<DST>]?: Key extends keyof SRC
// 			? //
// 			  Select<SRC[Key], DST[Key]>
// 			: SRC[Key]
// 	} & {
// 		[Key in keyof Required<DST>]-?: Key extends keyof SRC
// 			? //
// 			  Select<SRC[Key], DST[Key]>
// 			: SRC[Key]
// 	},
// 	FieldsToRemove
// >

// type RenameAliases<DST, Key> = Key extends `${infer Alias}:${Extract<keyof DST, string>}` ? Alias : Key

// type SelectUnion<SRC extends UnionLike, DST> = {
// 	[Resolver in keyof SRC['__union']]: Pick<
// 		{
// 			[Field in keyof SRC['__union'][Resolver]]: Field extends keyof DST
// 				? Select<SRC['__union'][Resolver][Field], DST[Field]>
// 				: Field extends keyof DST[Resolver]
// 				? Select<SRC['__union'][Resolver][Field], DST[Resolver][Field]>
// 				: never
// 		},
// 		Exclude<keyof DST | keyof DST[Resolver], FieldsToRemove | `...on ${string}`>
// 	>
// }[keyof SRC['__union']]

type UnionKey = `...on ${string}`

type SelectUnion<SRC extends UnionLike, DST> = {
	[Resolver in keyof SRC['__union']]: RenameAliases<
		{
			[Key in keyof Omit<DST, FieldsToRemove | UnionKey>]: InferResponse<
				SRC['__union'][Resolver][Key],
				DST[Key]
			>
		} & {
			[Key in keyof Omit<DST[Resolver], FieldsToRemove | UnionKey>]: InferResponse<
				SRC['__union'][Resolver][Key],
				DST[Resolver][Key]
			>
		}
	>
	// Omit<
	// 	{
	// 		[Key in keyof Omit<DST, FieldsToRemove | `...on ${string}`>]: Select<SRC['__union'][Resolver][Key], DST[Key]>
	// 	} & {
	// 		[Key in keyof Omit<DST[Resolver], FieldsToRemove | `...on ${string}`>]: Select<SRC['__union'][Resolver][Key], DST[Resolver][Key]>
	// 	},
	// 	FieldsToRemove | `...on ${string}`
	// >
}[keyof SRC['__union']]
