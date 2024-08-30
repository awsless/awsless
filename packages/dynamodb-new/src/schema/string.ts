import { Schema } from './schema'

export function string(): Schema<'S', string, string>
export function string<T extends string>(): Schema<'S', T, T>
export function string<T extends string>() {
	return new Schema<'S', T, T>(
		'S',
		value => ({ S: value }),
		value => value.S as T
	)
}
