import {
	BinaryExpression,
	BooleanExpression,
	NumberExpression,
	SetExpression,
	StringExpression,
} from '../expression/types'
import { AnySchema, BaseSchema, createSchema } from './schema'

// export type OptionalSchema<T extends AnySchema> = T & {
// 	[key: symbol]: {
// 		Input: T[symbol]['Input'] | undefined
// 		Output: T[symbol]['Output'] | undefined
// 	}
// }

export type OptionalSchema<T extends AnySchema> = BaseSchema<
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
					: 'SS' | 'NS' | 'BN' extends T['type']
						? SetExpression<T['type'], T[symbol]['Type'] | undefined>
						: T[symbol]['Expression']
>

export const optional = <T extends AnySchema>(schema: T): OptionalSchema<T> => {
	return createSchema({
		...schema,
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
