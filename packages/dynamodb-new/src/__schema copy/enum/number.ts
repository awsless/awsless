import { createSchema } from '../schema'

type NumberEnum = {
	[key: number | string]: number | string
}

export const numberEnum = <T extends NumberEnum>(_: T) =>
	createSchema<'N', T[keyof T], T[keyof T]>({
		type: 'N',
		encode: value => value.toString(),
		decode: value => Number(value) as T[keyof T],
	})
