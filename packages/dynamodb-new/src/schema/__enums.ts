import { Struct } from './struct'

export const enums = <T extends string>() =>
	new Struct<string, T, T>(
		'S',
		value => value,
		value => value as T
	)
