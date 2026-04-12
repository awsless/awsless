
import { Struct } from "./struct";

export const ttl = () => new Struct<string, Date, Date>(
	'N',
	(value) => String(Math.floor(value.getTime() / 1000)),
	(value) => new Date(Number(value) * 1000)
)
