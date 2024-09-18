import { AnyTableDefinition } from "../table";

export type ExtractInput<I, T extends AnyTableDefinition> =
	I extends T['schema']['INPUT'] ?
	Exclude<keyof I, keyof T['schema']['INPUT']> extends never ?
	T : never : never;
