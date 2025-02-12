import { Client } from '@opensearch-project/opensearch/.'
import { AnySchema } from './schema/schema'

export type Table<I extends string, S extends AnySchema> = {
	index: I
	schema: S
	client: () => Client
}

export type AnyTable = Table<string, AnySchema>

export const define = <I extends string, S extends AnySchema>(
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
