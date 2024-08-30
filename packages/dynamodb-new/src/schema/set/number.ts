import { number } from '../number'
import { SetSchema } from './schema'

export function numberSet(): SetSchema<'NS', Set<number>, Set<number>>
export function numberSet<T extends number>(): SetSchema<'NS', Set<T>, Set<T>>
export function numberSet<T extends number>() {
	return new SetSchema<'NS', Set<T>, Set<T>>(
		'NS',
		value => (value.size > 0 ? { NS: Array.from(value).map(item => item.toString()) } : undefined),
		value => new Set<T>(value?.NS.map(item => Number(item) as T)),
		() => number()
	)
}
