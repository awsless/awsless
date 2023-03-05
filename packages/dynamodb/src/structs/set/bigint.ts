import { bigint } from "../bigint";
import { Struct } from "../struct";

export const bigintSet = () => new Struct<string[], Set<bigint>, Set<bigint>>(
	'NS',
	(value) => Array.from(value).map(item => item.toString()),
	(value) => new Set(value.map(item => BigInt(item))),
	() => bigint()
)
