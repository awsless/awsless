
import { BinaryValue } from "../types/binary";
import { Struct } from "./struct";

export const binary = () => new Struct<BinaryValue, BinaryValue, Uint8Array>(
	'B',
	(value) => value,
	(value) => value as Uint8Array
)
