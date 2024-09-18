import { string } from '../string'
import { SetStruct } from './struct'

export function stringSet(): SetStruct<string[], Set<string>, Set<string>>
export function stringSet<T extends string>(): SetStruct<string[], Set<T>, Set<T>>
export function stringSet<T extends string>() {
	return new SetStruct<string[], Set<T>, Set<T>>(
		'SS',
		value => Array.from(value),
		value => new Set<T>(value as T[]),
		() => string()
	)
}

// export const stringSet = () => new SetStruct<string[], Set<string>, Set<string>>(
// 	'SS',
// 	(value) => Array.from(value),
// 	(value) => new Set(value),
// 	() => string(),
// )
