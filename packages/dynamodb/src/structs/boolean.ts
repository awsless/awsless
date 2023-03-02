import { Struct } from "./struct";

export const boolean = () => new Struct<'BOOL', boolean, boolean, boolean>(
	(value) => ({ BOOL: value }),
	(value) => value.BOOL
)
