import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type DateSchema = BaseSchema<'N', Date, NumberExpression<Date>>

export const date = (): DateSchema =>
	createSchema({
		type: 'N',
		encode: value => String(value.getTime()),
		decode: value => new Date(Number(value)),
	})
