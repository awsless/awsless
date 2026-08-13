import { Struct } from '../struct'

type BigIntEnum = {
	[key: string | number]: bigint
}

export const bigintEnum = <T extends BigIntEnum>(_: T) =>
	new Struct<string, T[keyof T], T[keyof T]>(
		'N',
		value => value.toString(),
		value => BigInt(value) as T[keyof T]
	)
