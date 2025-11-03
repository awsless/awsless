import { MapExpression } from '../expression/types'
import { AnySchema, BaseSchema, createSchema } from './schema'

type Infer<S extends AnySchema> = Record<string, S[symbol]['Type']>

export type RecordSchema<S extends AnySchema> = BaseSchema<
	//
	'M',
	Infer<S>,
	MapExpression<Infer<S>, {}, S>
>

export const record = <S extends AnySchema>(schema: S): RecordSchema<S> =>
	createSchema({
		type: 'M',
		encode(input) {
			const result: Record<string, any> = {}

			for (const [key, value] of Object.entries(input)) {
				result[key] = schema.marshall(value)
			}

			return result
		},
		decode(output) {
			const result: Infer<S> = {}

			for (const [key, value] of Object.entries(output)) {
				result[key] = schema.unmarshall(value)
			}

			return result
		},
		walk(_, ...rest) {
			return rest.length ? schema.walk?.(...rest) : schema
		},
	})
