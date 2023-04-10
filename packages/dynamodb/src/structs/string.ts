
import { Struct } from "./struct";

// export const string = <T extends string = string>() => new Struct<string, T, T>(
// 	'S',
// 	(value) => value,
// 	(value) => value as T
// )

export const string = () => new Struct<string, string, string>(
	'S',
	(value) => value,
	(value) => value
)
