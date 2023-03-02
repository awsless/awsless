
import { string } from "../string";
import { Struct } from "../struct";

export const stringSet = () => new Struct<'SS', string[], Set<string>, Set<string>>(
	(value) => ({ SS: Array.from(value) }),
	(value) => new Set(value.SS),
	() => string(),
)
