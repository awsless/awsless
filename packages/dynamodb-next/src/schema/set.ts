import { SetExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

type AllowedSchema = BaseSchema<'S'> | BaseSchema<'N'> | BaseSchema<'B'>

export type SetSchema<T extends AllowedSchema> = BaseSchema<
	`${NonNullable<T['type']>}S`,
	Set<T[symbol]['Type']>,
	SetExpression<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']>>
>

export const set = <S extends AllowedSchema>(schema: S): SetSchema<S> => {
	const type = `${schema.type}S` as `${NonNullable<S['type']>}S`

	return createSchema<`${NonNullable<S['type']>}S`, Set<S[symbol]['Type']>>({
		type,
		encode(value) {
			if (value.size === 0) {
				return undefined as any
			}

			return Array.from(value).map(v => {
				return schema.encode(v)
			})
		},
		decode(value) {
			return new Set<S[symbol]['Type']>(
				value.map(v => {
					return schema.decode(v as any)
				})
			)
		},
		unmarshall(value) {
			if (typeof value === 'undefined') {
				return new Set()
			}

			return this.decode!(value[type] as any)
		},
		filterIn: value => typeof value === 'undefined' || value.size === 0,
		filterOut: () => false,
		walk: () => schema,
	})
}
