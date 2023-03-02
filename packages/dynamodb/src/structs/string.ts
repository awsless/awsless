
import { Struct } from "./struct";

export const string = () => new Struct<'S', string, string, string>(
	(value) => ({ S: value }),
	(value) => value.S
)
