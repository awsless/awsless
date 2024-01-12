export class Arg<Type extends string = string, Value = unknown> {
	constructor(readonly type: Type, readonly value: Value) {}
}

export const $ = <Type extends string, Value extends unknown>(type: Type, value: Value) => {
	return new Arg(type, value)
}

// export type Arg<Type extends string, Value extends unknown> = readonly [Type, Value]

// export const $ = <Type extends string, Value extends unknown>(type: Type, value: Value) => {
// 	return [type, value] as const
// }

// export type Arg<Type extends string, Value extends unknown> = {
// 	type: Type
// 	value: Value
// }

// export const $ = <Type extends string, Value extends unknown>(type: Type, value: Value) => {
// 	return { type, value }
// }

// export class Arg<Name extends string = string, Type extends string = string, Value = unknown> {
// 	declare value: Value
// 	constructor(readonly name: Name, readonly type: Type) {}
// }

// export const $ = <Name extends string, Type extends string>(name: Name, type: Type) => {
// 	return new Arg<Name, Type, any>(name, type)
// }

// type InferArg<R extends Arg, T extends Arg> = Record<T['name'], R['value']>

// type InferObject<R extends object, T extends object> = {
// 	[K in keyof T]: K extends keyof R ? InferVariables<R[K], T[K]> : never
// }[keyof T]

// type InferArray<R extends any[], T extends any[]> = InferVariables<R[number], T[number]>

// export type InferVariables<R, T> = {
// 	arg: T extends Arg ? (R extends Arg ? InferArg<R, T> : never) : never
// 	array: T extends any[] ? (R extends any[] ? InferArray<R, T> : never) : never
// 	object: T extends object ? (R extends object ? InferObject<R, T> : never) : never
// 	else: never
// }[T extends Arg ? 'arg' : T extends any[] ? 'array' : T extends object ? 'object' : 'else']

// export type InferVariables<R, T> = T extends Arg
// 	? R extends Arg
// 		? InferArg<R, T>
// 		: never
// 	: T extends any[]
// 	? R extends any[]
// 		? InferArray<R, T>
// 		: never
// 	: T extends object
// 	? R extends object
// 		? InferObject<R, T>
// 		: never
// 	: never

// const emit = <T, R extends T>(request:R, var:InferVariables<T, R>) => {
// 	console.log(request, var);
// }

// const emit = <T, R = T>(request: R, variables: InferVariables<T, R>) => {
// 	console.log(request, variables)
// }

// emit<{
// 	transaction: {
// 		a: Arg<string, 'String!', string>
// 		b: Arg<string, 'Int', number>
// 		c?: Arg<string, 'String', string | undefined>
// 	}
// }>(
// 	{
// 		transaction: {
// 			a: $('name', 'String!'),
// 			b: $('limit', 'Int'),
// 		},
// 	},
// 	{}
// )

// const lol: InferVariables<
// 	{
// 		transaction: [
// 			{
// 				a: Arg<string, 'String!', string>
// 				b: Arg<string, 'Int', number>
// 				c: Arg<string, 'String', string | undefined>
// 			}
// 		]
// 	},
// 	{
// 		transaction: [
// 			{
// 				a: Arg<'name', 'String!'>
// 				b: Arg<'limit', 'Int'>
// 				c: Arg<'cursor', 'String'>
// 			}
// 		]
// 	}
// > = {
// 	// 'cursor'
// 	// 'cursor'
// 	// name: 'Lol',
// 	// limit: 1,
// 	// cursor: 'c',
// }

// console.log(lol)
