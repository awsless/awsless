import { BaseSchema, createSchema, Types } from './schema'

export const optional = <
	//
	I,
	O,
	P extends Array<string | number> = [],
	OP extends Array<string | number> = [],
>(
	schema: BaseSchema<any, I, O, P, OP, false>
) => {
	return createSchema<Types, I | undefined, O | undefined, P, OP, true>({
		...schema,
		optional: true,
		marshall(value) {
			if (typeof value === 'undefined') {
				return undefined
			}

			return schema.marshall(value)
		},
		unmarshall(value) {
			if (typeof value === 'undefined') {
				return undefined
			}

			return schema.unmarshall(value)
		},
	})
}
