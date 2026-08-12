import { Schema } from './schema'

export function bigint(): Schema<'N', bigint, bigint>
export function bigint<T extends bigint>(): Schema<'N', T, T>
export function bigint<T extends bigint>() {
	return new Schema<'N', T, T>(
		'N',
		value => ({ N: value.toString() }),
		value => BigInt(value.N) as T
	)
}
