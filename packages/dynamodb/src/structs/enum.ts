import { Struct } from './struct'

type StringEnum = {
	[key: string | number]: string
}

export const enum_ = <T extends StringEnum>(_: T) =>
	new Struct<string, T[keyof T], T[keyof T]>(
		'S',
		value => value,
		value => value as T[keyof T]
	)
