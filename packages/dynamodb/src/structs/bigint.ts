import { Struct } from "./struct";

export const bigint = () => new Struct<'N', string, bigint, bigint>(
	(value) => ({ N: value.toString() }),
	(value) => BigInt(value.N)
)
