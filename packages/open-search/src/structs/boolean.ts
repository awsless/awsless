
import { Struct } from "./struct";

export const boolean = () => new Struct<boolean, boolean, boolean>(
	(value) => value,
	(value) => value,
	{ type: 'boolean' },
)
