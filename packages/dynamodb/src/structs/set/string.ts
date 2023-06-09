
import { string } from "../string";
import { SetStruct } from "./struct";

export const stringSet = () => new SetStruct<string[], Set<string>, Set<string>>(
	'SS',
	(value) => Array.from(value),
	(value) => new Set(value),
	() => string(),
)
