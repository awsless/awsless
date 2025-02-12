import { AnySchema, Schema } from './schema'

export const set = <S extends AnySchema>(struct: S) => {
	return new Schema<S['ENCODED'][], Set<S['INPUT']>, Set<S['OUTPUT']>>(
		input => [...input].map(item => struct.encode(item)),
		encoded => new Set(encoded.map(item => struct.decode(item))),
		struct.mapping
	)
}
