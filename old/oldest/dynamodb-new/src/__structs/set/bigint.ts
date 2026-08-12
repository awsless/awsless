import { bigint } from '../bigint'
import { SetStruct } from './struct'

export function bigintSet(): SetStruct<string[], Set<bigint>, Set<bigint>>
export function bigintSet<T extends bigint>(): SetStruct<string[], Set<T>, Set<T>>
export function bigintSet<T extends bigint>() {
	return new SetStruct<string[], Set<T>, Set<T>>(
		'NS',
		value => Array.from(value).map(item => item.toString()),
		value => new Set<T>(value.map(item => BigInt(item)) as T[]),
		() => bigint()
	)
}
