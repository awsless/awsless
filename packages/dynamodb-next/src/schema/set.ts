import { SetExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

type AllowedSchema = BaseSchema<'S'> | BaseSchema<'N'> | BaseSchema<'B'>

export type SetSchema<T extends AllowedSchema> = BaseSchema<
	`${NonNullable<T['type']>}S`,
	Set<T[symbol]['Type']> | undefined,
	SetExpression<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']> | undefined>
>

export const set = <S extends AllowedSchema>(schema: S): SetSchema<S> => {
	const type = `${schema.type}S` as `${NonNullable<S['type']>}S`

	return createSchema<`${NonNullable<S['type']>}S`, Set<S[symbol]['Type']>>({
		type,
		encode(value) {
			// if (typeof value === 'undefined') {
			// 	return null
			// }
			// if (value.size === 0) {
			// 	return undefined as any
			// }

			return Array.from(value).map(v => {
				return schema.encode(v) as any
			})
		},
		decode(value) {
			// if (typeof value === 'undefined') {
			// 	return new Set()
			// }

			return new Set<S[symbol]['Type']>(
				value.map(v => {
					return schema.decode(v as any)
				})
			)
		},
		marshall(value) {
			// if (value.size === 0) {
			// 	return { M: { empty: { BOOL: true } } }
			// }

			if (value.size === 0) {
				return undefined
			}

			return {
				[type]: this.encode!(value),
			} as any
		},
		// unmarshall(value) {
		// 	// if ('M' in value && typeof value.M === 'object' && value.M !== null && 'empty' in value.M) {
		// 	// 	return new Set()
		// 	// }

		// 	if (typeof value === 'undefined') {
		// 		return new Set()
		// 	}

		// 	return this.decode!(value[type])
		// },

		// 	return this.decode!(value[type])
		// },
		// filterIn: value => typeof value === 'undefined' || value.size === 0,
		// filterOut: value => typeof value === 'undefined' || value.size === 0,
		// filterIn: () => false,
		// filterOut: () => false,
		walk: () => schema,
	})
}
