import { bigint } from "../bigint";
import { SetStruct } from "./struct";

export const bigintSet = () => new SetStruct<string[], Set<bigint>, Set<bigint>>(
	'NS',
	(value) => Array.from(value).map(item => item.toString()),
	(value) => new Set(value.map(item => BigInt(item))),
	() => bigint()
)
