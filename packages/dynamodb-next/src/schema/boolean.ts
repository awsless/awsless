import { BooleanExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BooleanSchema<T extends boolean = boolean> = BaseSchema<'BOOL', T, BooleanExpression<T>>

export function boolean(): BooleanSchema
export function boolean<T extends boolean>(): BooleanSchema<T>
export function boolean(): BooleanSchema {
	return createSchema({
		type: 'BOOL',
	})
}
