import { TupleExpression, TupleWithRestExpression } from '../expression/types'
import { AnySchema, BaseSchema, createSchema, MarshallInputTypes } from './schema'

type Tuple<Entries extends AnySchema[]> = {
	-readonly [Key in keyof Entries]: Entries[Key][symbol]['Type']
}

export type TupleSchema<T extends any[], L extends AnySchema[]> = BaseSchema<'L', T, TupleExpression<T, L>>
export type TupleWithRestSchema<T extends any[], L extends AnySchema[], R extends AnySchema> = BaseSchema<
	'L',
	T,
	TupleWithRestExpression<T, L, R>
>

export function tuple<const T extends AnySchema[]>(entries: T): TupleSchema<Tuple<T>, T>

export function tuple<const T extends AnySchema[], const R extends AnySchema>(
	entries: T,
	rest: R
): TupleWithRestSchema<[...Tuple<T>, ...Tuple<R[]>], T, R>

export function tuple<const T extends AnySchema[], const R extends AnySchema | undefined = undefined>(
	entries: T,
	rest?: R
): TupleSchema<Tuple<T>, T> {
	return createSchema({
		type: 'L',
		encode: value => value.map((item, i) => (entries[i] ?? rest)?.marshall(item) as MarshallInputTypes),
		decode: value => value.map((item, i) => (entries[i] ?? rest)?.unmarshall(item)) as any,
		walk(path, ...restPath) {
			const schema = entries[path as number] || rest
			return restPath.length ? schema?.walk?.(...restPath) : schema
		},
	})
}
