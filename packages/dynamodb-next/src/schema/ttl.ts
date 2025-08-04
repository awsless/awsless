import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type TtlSchema = BaseSchema<'N', Date, NumberExpression<Date>>

export const ttl = (): TtlSchema =>
	createSchema({
		type: 'N',
		encode: value => String(Math.floor(value.getTime() / 1000)),
		decode: value => new Date(Number(value) * 1000),
	})
