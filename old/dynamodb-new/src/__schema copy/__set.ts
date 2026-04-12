import { Schema } from './schema'
import { SetSchema } from './set/schema'

type AllowedSchema = Schema<'S', any, any> | Schema<'N', any, any> | Schema<'B', any, any>

export function set<S extends AllowedSchema>(schema: S) {
	const type = `${schema.type}S` as `${Exclude<S['type'], undefined>}S`

	return new SetSchema<`${Exclude<S['type'], undefined>}S`, Set<S['INPUT']>, Set<S['OUTPUT']>>(
		type,
		value => {
			if (value.size === 0) {
				return undefined
			}

			return {
				[type]: Array.from(value).map(v => {
					// @ts-ignore
					return schema.marshall(v)[schema.type!]
				}),
			} as Record<`${Exclude<S['type'], undefined>}S`, any[]>
		},
		value => {
			return new Set<S['OUTPUT']>(
				value?.[type].map(v => {
					return schema.unmarshall({
						[schema.type!]: v,
					} as any)
				})
			)
		},
		() => schema
	)
}
