
import { number } from "../number";
import { Struct } from "../struct";

export const numberSet = () => new Struct<'NS', string[], Set<number>, Set<number>>(
	(value) => ({ NS: Array.from(value).map(item => item.toString()) }),
	(value) => new Set(value.NS.map(item => Number(item))),
	() => number(),
)
