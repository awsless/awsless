
import { Struct } from "./struct";

export const string = () => new Struct<string, string, string>(
	(value) => value,
	(value) => value,
	{ type: 'keyword' },
)
