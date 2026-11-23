import { ClickHouseClient } from './client'
import { AnyObjectSchema } from './schema/object'

export type Table<N extends string, S extends AnyObjectSchema> = {
	name: N
	schema: S
	client: () => ClickHouseClient
}

export type AnyTable = Table<string, AnyObjectSchema>

export const define = <N extends string, S extends AnyObjectSchema>(
	name: N,
	schema: S,
	client: () => ClickHouseClient
): Table<N, S> => {
	return {
		name,
		schema,
		client,
	}
}
