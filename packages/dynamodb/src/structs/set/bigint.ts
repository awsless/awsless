import { bigint } from "../bigint";
import { Struct } from "../struct";

export const bigintSet = () => new Struct<'NS', string[], Set<bigint>, Set<bigint>>(
	(value) => ({ NS: Array.from(value).map(item => item.toString()) }),
	(value) => new Set(value.NS.map(item => BigInt(item))),
	() => bigint()
)
