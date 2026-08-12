import { Schema } from '../schema'

type NumberEnum = {
	[key: number | string]: number | string
}

export const numberEnum = <T extends NumberEnum>(_: T) =>
	new Schema<T[keyof T], T[keyof T]>(
		value => ({ N: value.toString() }),
		value => Number(value.N) as T[keyof T]
	)
