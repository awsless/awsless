import { StringExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type StringSchema<T extends string = string> = BaseSchema<'S', T, StringExpression<T>>

export function string(): StringSchema
export function string<T extends string>(): StringSchema<T>
export function string<T extends string>(): StringSchema<T> {
	return createSchema({
		type: 'S',
	})
}
