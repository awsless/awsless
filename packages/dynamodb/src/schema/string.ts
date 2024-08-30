import { Schema } from './schema'

export function string(): Schema<string, string>
export function string<T extends string>(): Schema<T, T>
export function string<T extends string>() {
	return new Schema<T, T>(
		value => ({ S: value }),
		value => value.S as T
	)
}
