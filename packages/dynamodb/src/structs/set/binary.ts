

import { BinaryValue } from "../../types/binary";
import { binary } from "../binary";
import { Struct } from "../struct";

export const binarySet = <T extends BinaryValue>() => new Struct<T[], Set<T>, Set<T>>(
	'BS',
	(value) => Array.from(value),
	(value) => new Set(value),
	() => binary<T>()
)
