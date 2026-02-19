import {
	BinaryExpression,
	BooleanExpression,
	NumberExpression,
	SetExpression,
	StringExpression,
} from '../expression/types'
import { BaseSchema, createSchema, GenericSchema } from './schema'

// export type OptionalSchema<T extends GenericSchema> = T & {
// 	[key: symbol]: {
// 		Input: T[symbol]['Input'] | undefined
// 		Output: T[symbol]['Output'] | undefined
// 	}
// }

export type OptionalSchema<T extends GenericSchema> = BaseSchema<
	T['type'],
	T[symbol]['Type'] | undefined,
	'S' extends T['type']
		? StringExpression<T[symbol]['Type'] | undefined>
		: 'N' extends T['type']
			? NumberExpression<T[symbol]['Type'] | undefined>
			: 'BOOL' extends T['type']
				? BooleanExpression<T[symbol]['Type'] | undefined>
				: 'B' extends T['type']
					? BinaryExpression<T[symbol]['Type'] | undefined>
					: NonNullable<T['type']> extends 'SS' | 'NS' | 'BS'
						? SetExpression<NonNullable<T['type']>, T[symbol]['Type'] | undefined>
						: T[symbol]['Expression']
>

export const optional = <T extends GenericSchema>(schema: T): OptionalSchema<T> => {
	return createSchema({
		...schema,
		marshall(value, path) {
			if (typeof value === 'undefined') {
				return { NULL: true }
			}

			return schema.marshall(value, path)
		},
		unmarshall(value, path) {
			if (typeof value === 'undefined' || value.NULL) {
				return undefined
			}

			return schema.unmarshall(value, path)
		},
		// validate(value) {
		// 	if (typeof value === 'undefined') {
		// 		return true
		// 	}

		// 	return schema.validate(value)
		// },
		validateInput(value) {
			if (typeof value === 'undefined') {
				return true
			}

			return schema.validateInput(value)
		},
		validateOutput(value) {
			if (typeof value === 'undefined' || value.NULL) {
				return true
			}

			return schema.validateOutput(value)
		},
	})
}
