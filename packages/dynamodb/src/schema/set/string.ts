import { Schema } from '../schema'
import { string } from '../string'

export function stringSet(): Schema<Set<string>, Set<string>>
export function stringSet<T extends string>(): Schema<Set<T>, Set<T>>
export function stringSet<T extends string>() {
	return new Schema<Set<T>, Set<T>>(
		value => ({ SS: Array.from(value) }),
		value => new Set<T>(value.SS as T[]),
		() => string()
	)
}
