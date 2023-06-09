
import { Struct } from "./struct";

export const number = () => new Struct<string, number, number>(
	(value) => value.toString(),
	(value) => Number(value),
	{ type: 'double' }
)
