import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type TtlSchema = BaseSchema<'N', Date, NumberExpression<Date>>

// export const ttl = (): TtlSchema =>
// 	createSchema({
// 		type: 'N',
// 		encode: value => String(Math.floor(value.getTime() / 1000)),
// 		decode: value => new Date(Number(value) * 1000),
// 		validate: value => value instanceof Date,
// 	})

export const ttl = (): TtlSchema =>
	createSchema({
		name: 'ttl',
		type: 'N',
		marshall: value => ({ N: String(Math.floor(value.getTime() / 1000)) }),
		unmarshall: value => new Date(Number(value.N) * 1000),
		// validate: value => value instanceof Date,
		validateInput: value => value instanceof Date,
		validateOutput: value => !!('N' in value && typeof value.N === 'string'),
	})
