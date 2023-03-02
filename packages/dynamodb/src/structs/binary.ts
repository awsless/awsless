
import { BinaryValue } from "../types/binary";
import { Struct } from "./struct";

export const binary = <T extends BinaryValue>() => new Struct<'B', T, T, T>(
	(value) => ({ B: value }),
	(value) => value.B
)
