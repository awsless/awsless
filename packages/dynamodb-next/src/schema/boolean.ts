import { BooleanExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BooleanSchema<T extends boolean = boolean> = BaseSchema<'BOOL', T, BooleanExpression<T>>

// export function boolean(): BooleanSchema
// export function boolean<T extends boolean>(): BooleanSchema<T>
// export function boolean<T extends boolean>(): BooleanSchema<T> {
// 	return createSchema({
// 		type: 'BOOL',
// 		validate: value => typeof value === 'boolean',
// 	})
// }

export function boolean(): BooleanSchema
export function boolean<T extends boolean>(): BooleanSchema<T>
export function boolean<T extends boolean>(): BooleanSchema<T> {
	return createSchema({
		name: 'boolean',
		type: 'BOOL',
		marshall: value => ({ BOOL: value }),
		unmarshall: value => value.BOOL as T,
		// validate: value => typeof value === 'boolean',
		validateInput: value => typeof value === 'boolean',
		validateOutput: value => !!('BOOL' in value && typeof value.BOOL === 'boolean'),
	})
}
