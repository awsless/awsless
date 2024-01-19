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
type NilLike = undefined | null

type Scalar = string | number | boolean | undefined
type Anify<T> = { [P in keyof T]?: any }

type FieldsToRemove = '__union' | '__name' | '__args'

type Optional<T, R> = T extends undefined ? R | undefined : R

// export type InferResponse<SRC extends Anify<DST> | undefined, DST> = DST extends NilLike
// 	? never
// 	: SRC extends NilLike
// 	? never
// 	: DST extends TupleLike
// 	? Optional<SRC, SelectTuple<SRC, DST>>
// 	: DST extends NeverLike
// 	? never
// 	: SRC extends Scalar
// 	? SRC
// 	: SRC extends ArrayLike
// 	? Optional<SRC, SelectArray<SRC, DST>>
// 	: SRC extends UnionLike
// 	? Optional<SRC, SelectUnion<SRC, DST>>
// 	: DST extends ObjectLike
// 	? Optional<SRC, SelectObject<SRC, DST>>
// 	: never

export type InferResponse<SRC extends Anify<DST> | undefined, DST> = {
	scalar: SRC
	tuple: Optional<SRC, DST extends TupleLike ? SelectTuple<SRC, DST> : never>
	union: Optional<SRC, SRC extends UnionLike ? SelectUnion<SRC, DST> : never>
	array: Optional<SRC, SRC extends ArrayLike ? SelectArray<SRC, DST> : never>
	object: Optional<SRC, SRC extends ObjectLike ? SelectObject<SRC, DST> : never>
	never: never
}[DST extends NilLike
	? 'never'
	: SRC extends NilLike
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

type RenameAliases<Object> = {
	[Key in keyof Object as Key extends `${infer Alias}:${string}` ? Alias : Key]: Object[Key]
}

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
}[keyof SRC['__union']]
