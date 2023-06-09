import { Struct } from "./struct";

export const bigint = () => new Struct<string, bigint, bigint>(
	(value) => value.toString(),
	(value) => BigInt(value),
	{ type: 'long' }
)
