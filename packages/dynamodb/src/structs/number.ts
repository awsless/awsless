
import { Struct } from "./struct";

export const number = () => new Struct<string, number, number>(
	'N',
	(value) => value.toString(),
	(value) => Number(value)
)
