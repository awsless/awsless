import { BooleanExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BooleanSchema<T extends boolean = boolean> = BaseSchema<'BOOL', T, BooleanExpression<T>>

export const boolean = (): BooleanSchema =>
	createSchema({
		type: 'BOOL',
	})
