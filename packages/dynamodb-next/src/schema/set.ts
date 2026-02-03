import { SetExpression } from '../expression/types'
import { AttributeOutputValue, BaseSchema, createSchema } from './schema'

type AllowedSchema = BaseSchema<'S'> | BaseSchema<'N'> | BaseSchema<'B'>

export const SET_KEY = '__set__'

export type SetSchema<T extends AllowedSchema> = BaseSchema<
	`${NonNullable<T['type']>}S`,
	Set<T[symbol]['Type']>,
	SetExpression<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']>>
>

// export const set = <S extends AllowedSchema>(schema: S): SetSchema<S> => {
// 	const type = `${schema.type}S` as `${NonNullable<S['type']>}S`

// 	return createSchema<`${NonNullable<S['type']>}S`, Set<S[symbol]['Type']>>({
// 		type,
// 		encode(value) {
// 			return Array.from(value).map(v => {
// 				return schema.encode(v) as any
// 			})
// 		},
// 		decode(value) {
// 			return new Set<S[symbol]['Type']>(
// 				value.map(v => {
// 					return schema.decode(v as any)
// 				})
// 			)
// 		},
// 		marshall(value) {
// 			if (value.size === 0) {
// 				return { M: {} } as any
// 			}

// 			return {
// 				M: {
// 					[SET_KEY]: {
// 						[type]: this.encode!(value),
// 					},
// 				},
// 			} as any
// 		},
// 		unmarshall(value: any) {
// 			if ('M' in value) {
// 				const map = value.M
// 				if (map[SET_KEY]) {
// 					return this.decode!(map[SET_KEY][type])
// 				}
// 				return new Set()
// 			}

// 			// Fallback for legacy data stored as raw sets
// 			if (type in value) {
// 				return this.decode!(value[type])
// 			}

// 			return new Set()
// 		},
// 		marshallInner(value) {
// 			if (value.size === 0) {
// 				return undefined as any
// 			}

// 			return {
// 				[type]: this.encode!(value),
// 			}
// 		},
// 		walk: () => schema,
// 	})
// }

export const set = <S extends AllowedSchema>(schema: S): SetSchema<S> => {
	const type = `${schema.type}S` as `${NonNullable<S['type']>}S`

	const encode = (value: Set<S[symbol]['Type']>) => {
		return Array.from(value).map(v => {
			const marshalled: any = schema.marshall(v)
			return marshalled[schema.type!]
		})
	}

	const decode = (
		value: Array<AttributeOutputValue<'S'> & AttributeOutputValue<'N'> & AttributeOutputValue<'B'>>
	) => {
		return new Set<S[symbol]['Type']>(
			value.map(v => {
				return schema.unmarshall({ [schema.type!]: v } as any)
			})
		)
	}

	return createSchema<`${NonNullable<S['type']>}S`, Set<S[symbol]['Type']>>({
		type,
		// validate: value => value instanceof Set,
		marshall(value) {
			if (value.size === 0) {
				return { M: {} } as any
			}

			return {
				M: {
					[SET_KEY]: {
						[type]: encode(value),
					},
				},
			} as any
		},
		unmarshall(value) {
			if ('M' in value) {
				const map = value.M as any
				if (map[SET_KEY]) {
					return decode(map[SET_KEY][type])
				}

				return new Set()
			}

			// Fallback for legacy data stored as raw sets
			if (type in value) {
				return decode(value[type] as any)
			}

			return new Set()
		},
		// marshallInner(value) {
		// 	if (value.size === 0) {
		// 		return undefined as any
		// 	}

		// 	return {
		// 		[type]: encode(value),
		// 	}
		// },
		// validate: value => value instanceof Set,
		validateInput: value => value instanceof Set,
		validateOutput: (value: any) =>
			!!(
				'M' in value &&
				(SET_KEY in value.M ? type in value.M[SET_KEY] && Array.isArray(value.M[SET_KEY][type]) : true)
			),
		walk: () => schema,
	})
}
