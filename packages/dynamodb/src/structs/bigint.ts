import { Struct } from "./struct";

export const bigint = () => new Struct<string, bigint, bigint>(
	'N',
	(value) => value.toString(),
	(value) => BigInt(value)
)
