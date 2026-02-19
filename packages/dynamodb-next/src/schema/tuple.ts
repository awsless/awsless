import { TupleExpression, TupleWithRestExpression } from '../expression/types'
import { BaseSchema, createSchema, GenericSchema, MarshallInputTypes } from './schema'

type Tuple<Entries extends GenericSchema[]> = {
	-readonly [Key in keyof Entries]: Entries[Key][symbol]['Type']
}

export type TupleSchema<T extends any[], L extends GenericSchema[]> = BaseSchema<'L', T, TupleExpression<T, L>>
export type TupleWithRestSchema<T extends any[], L extends GenericSchema[], R extends GenericSchema> = BaseSchema<
	'L',
	T,
	TupleWithRestExpression<T, L, R>
>

export function tuple<const T extends GenericSchema[]>(entries: T): TupleSchema<Tuple<T>, T>

export function tuple<const T extends GenericSchema[], const R extends GenericSchema>(
	entries: T,
	rest: R
): TupleWithRestSchema<[...Tuple<T>, ...Tuple<R[]>], T, R>

// export function tuple<const T extends GenericSchema[], const R extends GenericSchema | undefined = undefined>(
// 	entries: T,
// 	rest?: R
// ): TupleSchema<Tuple<T>, T> {
// 	return createSchema({
// 		type: 'L',
// 		validate: value => Array.isArray(value),
// 		encode: value => value.map((item, i) => (entries[i] ?? rest)?.marshall(item) as MarshallInputTypes),
// 		decode: value => value.map((item, i) => (entries[i] ?? rest)?.unmarshall(item)) as any,
// 		walk(path, ...restPath) {
// 			const schema = entries[path as number] ?? rest
// 			return restPath.length ? schema?.walk?.(...restPath) : schema
// 		},
// 	})
// }

export function tuple<const T extends GenericSchema[], const R extends GenericSchema | undefined = undefined>(
	entries: T,
	rest?: R
): TupleSchema<Tuple<T>, T> {
	return createSchema({
		name: 'tuple',
		type: 'L',
		marshall: (value, path) => ({
			L: value.map((item, i) => (entries[i] ?? rest)?.marshall(item, [...path, i]) as MarshallInputTypes),
		}),
		unmarshall: (value, path) =>
			value.L.map((item, i) => (entries[i] ?? rest)?.unmarshall(item, [...path, i])) as Tuple<T>,
		// validate: value => Array.isArray(value),
		validateInput: value => Array.isArray(value),
		validateOutput: value => !!('L' in value && Array.isArray(value.L)),
		walk(path, ...restPath) {
			const schema = entries[path as number] ?? rest
			return restPath.length ? schema?.walk?.(...restPath) : schema
		},
	})
}
