import { bigint } from '../bigint'
import { Schema } from '../schema'

export function bigintSet(): Schema<Set<bigint>, Set<bigint>>
export function bigintSet<T extends bigint>(): Schema<Set<T>, Set<T>>
export function bigintSet<T extends bigint>() {
	return new Schema<Set<T>, Set<T>>(
		value => ({ NS: Array.from(value).map(item => item.toString()) }),
		value => new Set<T>(value.NS.map(item => BigInt(item) as T)),
		() => bigint()
	)
}
