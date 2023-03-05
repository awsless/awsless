
import { BinaryValue } from "../types/binary";
import { Struct } from "./struct";

export const binary = <T extends BinaryValue>() => new Struct<T, T, T>(
	'B',
	(value) => value,
	(value) => value
)
