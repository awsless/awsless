import { bigint } from '../bigint'
import { SetSchema } from './schema'

export function bigintSet(): SetSchema<'NS', Set<bigint>, Set<bigint>>
export function bigintSet<T extends bigint>(): SetSchema<'NS', Set<T>, Set<T>>
export function bigintSet<T extends bigint>() {
	return new SetSchema<'NS', Set<T>, Set<T>>(
		'NS',
		value => (value.size > 0 ? { NS: Array.from(value).map(item => item.toString()) } : undefined),
		value => new Set<T>(value?.NS.map(item => BigInt(item) as T)),
		() => bigint()
	)
}
