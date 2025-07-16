import { string } from '../string'
import { SetSchema } from './schema'

export function stringSet(): SetSchema<'SS', Set<string>, Set<string>>
export function stringSet<T extends string>(): SetSchema<'SS', Set<T>, Set<T>>
export function stringSet<T extends string>() {
	return new SetSchema<'SS', Set<T>, Set<T>>(
		'SS',
		value => (value.size > 0 ? { SS: Array.from(value) } : undefined),
		value => new Set<T>(value?.SS as T[]),
		() => string()
	)
}
