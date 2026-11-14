import { AnySchema, Schema } from './schema'

export const array = <S extends AnySchema>(schema: S) =>
	new Schema<S['ENCODED'][], S['INPUT'][], S['OUTPUT'][]>(
		input => input.map(item => schema.encode(item)),
		encoded => encoded.map(item => schema.decode(item)),
		`Array(${schema.type})`
	)
