import { BaseSchema, createSchema } from './schema'

export function number(): BaseSchema<'N', number, number>
export function number<T extends number>(): BaseSchema<'N', T, T>
export function number<T extends number>() {
	return createSchema<'N', T, T>({
		type: 'N',
		encode: value => value.toString(),
		decode: value => Number(value) as T,
	})
}
