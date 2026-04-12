import { Schema } from './schema'

export function bigint(): Schema<bigint, bigint>
export function bigint<T extends bigint>(): Schema<T, T>
export function bigint<T extends bigint>() {
	return new Schema<T, T>(
		value => ({ N: value.toString() }),
		value => BigInt(value.N) as T
	)
}
