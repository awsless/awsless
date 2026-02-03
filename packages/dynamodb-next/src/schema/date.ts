import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type DateSchema = BaseSchema<'N', Date, NumberExpression<Date>>

// export const date = (): DateSchema =>
// 	createSchema({
// 		type: 'N',
// 		encode: value => String(value.getTime()),
// 		decode: value => new Date(Number(value)),
// 		validate: value => value instanceof Date,
// 	})

export const date = (): DateSchema =>
	createSchema({
		type: 'N',
		marshall: value => ({ N: String(value.getTime()) }),
		unmarshall: value => new Date(Number(value.N)),
		// validate: value => value instanceof Date,
		validateInput: value => value instanceof Date,
		validateOutput: value => !!('N' in value && typeof value.N === 'string'),
	})
