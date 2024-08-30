import { Struct } from './struct'

export function number(): Struct<string, number, number>
export function number<T extends number>(): Struct<string, T, T>
export function number<T extends number>() {
	return new Struct<string, T, T>(
		'N',
		value => value.toString(),
		value => Number(value) as T
	)
}
