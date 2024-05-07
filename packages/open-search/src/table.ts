import { Client } from '@opensearch-project/opensearch/.'
import { AnyStruct } from './structs/struct'

export type Table<I extends string, S extends AnyStruct> = {
	index: I
	schema: S
	client: () => Client
}

export type AnyTable = Table<string, AnyStruct>

export const define = <I extends string, S extends AnyStruct>(
	index: I,
	schema: S,
	client: () => Client
): Table<I, S> => {
	return {
		index,
		schema,
		client,
	}
}
