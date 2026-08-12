import { BaseSchema, createSchema } from './schema'

type AllowedSchema = BaseSchema<'S', any, any> | BaseSchema<'N', any, any> | BaseSchema<'B', any, any>
// type AllowedSchema = BaseSchema<'S' | 'B' | 'N', any, any>

export const set = <S extends AllowedSchema>(schema: S) => {
	const type = `${schema.type}S` as `${Exclude<S['type'], undefined>}S`

	return createSchema<`${Exclude<S['type'], undefined>}S`, Set<S['INPUT']>, Set<S['OUTPUT']>>({
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
			return new Set<S['OUTPUT']>(
				value.map(v => {
					return schema.decode(v as any)
				})
			)
		},
		unmarshall(value) {
			if (typeof value === 'undefined') {
				return new Set()
			}

			return this.decode!(value[type])
		},
		filterIn: value => typeof value === 'undefined' || value.size === 0,
		filterOut: () => false,
		walk: () => schema,
	})
}
