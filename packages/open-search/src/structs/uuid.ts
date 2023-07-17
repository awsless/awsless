
import { UUID } from 'node:crypto';
import { Struct } from "./struct";

export const uuid = () => new Struct<UUID, UUID, UUID>(
	(value) => value,
	(value) => value,
	{ type: 'keyword' },
)
