

import { BinaryValue } from "../../types/binary";
import { binary } from "../binary";
import { Struct } from "../struct";

export const binarySet = () => new Struct<BinaryValue[], Set<BinaryValue>, Set<Uint8Array>>(
	'BS',
	(value) => Array.from(value),
	(value) => new Set(value) as Set<Uint8Array>,
	() => binary()
)
