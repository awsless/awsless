import { AnySchema, Schema } from './schema'

// ClickHouse wants LowCardinality outside Nullable.
const nullableType = (type: string) => {
	const inner = type.match(/^LowCardinality\((.*)\)$/)?.[1]

	return inner ? `LowCardinality(Nullable(${inner}))` : `Nullable(${type})`
}

export const nullable = <S extends AnySchema>(schema: S) =>
	new Schema<S['ENCODED'] | null, S['INPUT'] | null, S['OUTPUT'] | null>(
		input => (input === null ? null : schema.encode(input)),
		encoded => (encoded === null ? null : schema.decode(encoded)),
		nullableType(schema.type)
	)
