import { Struct } from './struct'

export function bigint(): Struct<string, bigint, bigint>
export function bigint<T extends bigint>(): Struct<string, T, T>
export function bigint<T extends bigint>() {
	return new Struct<string, T, T>(
		'N',
		value => value.toString(),
		value => BigInt(value) as T
	)
}
