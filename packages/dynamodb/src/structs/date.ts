
import { Struct } from "./struct";

export const date = () => new Struct<string, Date, Date>(
	'N',
	(value) => String(value.getTime()),
	(value) => new Date(Number(value))
)
