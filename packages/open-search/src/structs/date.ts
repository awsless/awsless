
import { Struct } from "./struct";

export const date = () => new Struct<string, Date, Date>(
	(value) => value.toISOString(),
	(value) => new Date(value),
	{ type: 'date' },
)
