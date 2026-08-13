import { Struct } from '../struct'

type NumberEnum = {
	[key: number | string]: number | string
}

export const numberEnum = <T extends NumberEnum>(_: T) =>
	new Struct<string, T[keyof T], T[keyof T]>(
		'N',
		value => value.toString(),
		value => Number(value) as T[keyof T]
	)
