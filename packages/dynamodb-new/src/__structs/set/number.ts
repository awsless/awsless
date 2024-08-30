import { number } from '../number'
import { SetStruct } from './struct'

export function numberSet(): SetStruct<string[], Set<number>, Set<number>>
export function numberSet<T extends number>(): SetStruct<string[], Set<T>, Set<T>>
export function numberSet<T extends number>() {
	return new SetStruct<string[], Set<T>, Set<T>>(
		'NS',
		value => Array.from(value).map(item => item.toString()),
		value => new Set<T>(value.map(item => Number(item)) as T[]),
		() => number()
	)
}

// export const numberSet = () =>
// 	new SetStruct<string[], Set<number>, Set<number>>(
// 		'NS',
// 		value => Array.from(value).map(item => item.toString()),
// 		value => new Set(value.map(item => Number(item))),
// 		() => number()
// 	)
