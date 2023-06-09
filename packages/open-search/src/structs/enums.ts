
import { Struct } from "./struct";

export const enums = <T extends string>() => new Struct<string, T, T>(
	(value) => value,
	(value) => value as T,
	{ type: 'text' },
)
