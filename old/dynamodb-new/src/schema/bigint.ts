import { BaseSchema, createSchema } from './schema'

export function bigint(): BaseSchema<'N', bigint, bigint>
export function bigint<T extends bigint>(): BaseSchema<'N', T, T>
export function bigint<T extends bigint>() {
	return createSchema<'N', T, T>({
		type: 'N',
		encode: value => value.toString(),
		decode: value => BigInt(value) as T,
	})
}
