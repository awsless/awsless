import { MapExpression } from '../expression/types'
import { AttributeInput, BaseSchema, createSchema, GenericSchema } from './schema'

type Infer<S extends GenericSchema> = Record<string, S[symbol]['Type']>

export type RecordSchema<S extends GenericSchema> = BaseSchema<
	//
	'M',
	Infer<S>,
	MapExpression<Infer<S>, {}, S>
>

// export const record = <S extends GenericSchema>(schema: S): RecordSchema<S> =>
// 	createSchema({
// 		type: 'M',
// 		encode(input) {
// 			const result: Record<string, any> = {}

// 			for (const [key, value] of Object.entries(input)) {
// 				result[key] = schema.marshall(value)
// 			}

// 			return result
// 		},
// 		decode(output) {
// 			const result: Infer<S> = {}

// 			for (const [key, value] of Object.entries(output)) {
// 				result[key] = schema.unmarshall(value)
// 			}

// 			return result
// 		},
// 		walk(_, ...rest) {
// 			return rest.length ? schema.walk?.(...rest) : schema
// 		},
// 	})

export const record = <S extends GenericSchema>(schema: S): RecordSchema<S> =>
	createSchema({
		type: 'M',
		marshall(input) {
			const result: Record<string, AttributeInput<any>> = {}

			for (const [key, value] of Object.entries(input)) {
				const marshalled = schema.marshall(value)

				if (marshalled.NULL) {
					continue
				}

				result[key] = schema.marshall(value)
			}

			return { M: result }
		},
		unmarshall(output) {
			const result: Infer<S> = {}

			for (const [key, value] of Object.entries(output.M)) {
				result[key] = schema.unmarshall(value)
			}

			return result
		},
		validateInput: value => typeof value === 'object' && value !== null,
		validateOutput: value => !!('M' in value && typeof value.M === 'object' && value !== null),
		walk(_, ...rest) {
			return rest.length ? schema.walk?.(...rest) : schema
		},
	})
