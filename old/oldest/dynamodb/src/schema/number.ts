import { Schema } from './schema'

export function number(): Schema<number, number>
export function number<T extends number>(): Schema<T, T>
export function number<T extends number>() {
	return new Schema<T, T>(
		value => ({ N: value.toString() }),
		value => Number(value.N) as T
	)
}
