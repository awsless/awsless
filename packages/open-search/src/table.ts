import { AnyStruct } from "./structs/struct";

export type Table<I extends string, S extends AnyStruct> = {
	index: I
	schema: S
}

export type AnyTable = Table<string, AnyStruct>

export const define = <I extends string, S extends AnyStruct>(index:I, schema:S): Table<I, S> => {
	return {
		index,
		schema,
	}
}
