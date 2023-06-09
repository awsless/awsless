
import { number } from "../number";
import { SetStruct } from "./struct";

export const numberSet = () => new SetStruct<string[], Set<number>, Set<number>>(
	'NS',
	(value) => Array.from(value).map(item => item.toString()),
	(value) => new Set(value.map(item => Number(item))),
	() => number(),
)
