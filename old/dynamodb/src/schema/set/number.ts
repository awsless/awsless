import { number } from '../number'
import { Schema } from '../schema'

export function numberSet(): Schema<Set<number>, Set<number>>
export function numberSet<T extends number>(): Schema<Set<T>, Set<T>>
export function numberSet<T extends number>() {
	return new Schema<Set<T>, Set<T>>(
		value => ({ NS: Array.from(value).map(item => item.toString()) }),
		value => new Set<T>(value.NS.map(item => Number(item) as T)),
		() => number()
	)
}
