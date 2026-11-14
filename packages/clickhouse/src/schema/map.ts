import { AnySchema, Schema } from './schema'

export const map = <S extends AnySchema>(schema: S) =>
	new Schema<Record<string, S['ENCODED']>, Record<string, S['INPUT']>, Record<string, S['OUTPUT']>>(
		input => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, schema.encode(value)])),
		encoded => Object.fromEntries(Object.entries(encoded).map(([key, value]) => [key, schema.decode(value)])),
		`Map(String, ${schema.type})`
	)
