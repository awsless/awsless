

import { BinaryValue } from "../../types/binary";
import { binary } from "../binary";
import { Struct } from "../struct";

export const binarySet = <T extends BinaryValue>() => new Struct<'BS', T[], Set<T>, Set<T>>(
	(value) => ({ BS: Array.from(value) }),
	(value) => new Set(value.BS),
	() => binary<T>()
)
