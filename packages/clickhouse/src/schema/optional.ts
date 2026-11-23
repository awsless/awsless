import { AnySchema, Schema } from './schema'

// A column an insert may leave out, for one with a DEFAULT or MATERIALIZED
// expression in the stack file: the server fills it in. Reads still return it.
export class OptionalSchema<S extends AnySchema> extends Schema<S['ENCODED'], S['INPUT'], S['OUTPUT']> {
	declare readonly OPTIONAL: true

	constructor(readonly inner: S) {
		super(inner.encode, inner.decode, inner.type)
	}
}

export const optional = <S extends AnySchema>(schema: S) => new OptionalSchema(schema)
