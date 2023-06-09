
import { Struct } from "./struct";

export const string = () => new Struct<string, string, string>(
	'S',
	(value) => value,
	(value) => value
)
