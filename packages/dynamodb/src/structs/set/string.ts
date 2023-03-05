
import { string } from "../string";
import { Struct } from "../struct";

export const stringSet = () => new Struct<string[], Set<string>, Set<string>>(
	'SS',
	(value) => Array.from(value),
	(value) => new Set(value),
	() => string(),
)
