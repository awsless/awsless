
import { Struct } from "./struct";

export const enums = <T extends string[]>(values:T) => new Struct<string, T[number], T[number]>(
	'S',
	(value) => value,
	(value) => value
)

const lol = enums(['foo', 'bar'])

lol.INPUT
