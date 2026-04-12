import { Schema } from './schema'

export function number(): Schema<'N', number, number>
export function number<T extends number>(): Schema<'N', T, T>
export function number<T extends number>() {
	return new Schema<'N', T, T>(
		'N',
		value => ({ N: value.toString() }),
		value => Number(value.N) as T
	)
}
