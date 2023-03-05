
import { number } from "../number";
import { Struct } from "../struct";

export const numberSet = () => new Struct<string[], Set<number>, Set<number>>(
	'NS',
	(value) => Array.from(value).map(item => item.toString()),
	(value) => new Set(value.map(item => Number(item))),
	() => number(),
)
