import { AnySchema, Schema } from './schema'

export const array = <S extends AnySchema>(struct: S) => {
	return new Schema<S['ENCODED'][], S['INPUT'][], S['OUTPUT'][]>(
		input => input.map(item => struct.encode(item)),
		encoded => encoded.map(item => struct.decode(item)),
		struct.mapping
	)
}
