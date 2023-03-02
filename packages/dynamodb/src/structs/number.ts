
import { Struct } from "./struct";

export const number = () => new Struct<'N', string, number, number>(
	(value) => ({ N: value.toString() }),
	(value) => Number(value.N)
)
