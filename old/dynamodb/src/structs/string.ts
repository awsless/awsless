import { Struct } from './struct'

export function string(): Struct<string, string, string>
export function string<T extends string>(): Struct<string, T, T>
export function string<T extends string>() {
	return new Struct<string, T, T>(
		'S',
		value => value,
		value => value as T
	)
}
