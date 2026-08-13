import { Schema } from './schema'

export const optional = <
	//
	I,
	O,
	P extends Array<string | number> = [],
	OP extends Array<string | number> = [],
>(
	schema: Schema<I, O, P, OP>
) => {
	return new Schema<I | undefined, O | undefined, P, OP, true>(
		value => {
			if (typeof value === 'undefined') {
				return undefined
			}

			return schema.marshall(value)
		},
		value => {
			if (typeof value === 'undefined') {
				return undefined
			}

			return schema.unmarshall(value)
		},
		schema.walk
	)
}
