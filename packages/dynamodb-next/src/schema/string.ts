import { StringExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type StringSchema<T extends string = string> = BaseSchema<'S', T, StringExpression<T>>

// export function string(): StringSchema
// export function string<T extends string>(): StringSchema<T>
// export function string<T extends string>(): StringSchema<T> {
// 	return createSchema({
// 		type: 'S',
// 		validate: value => typeof value === 'string',
// 	})
// }

export function string(): StringSchema
export function string<T extends string>(): StringSchema<T>
export function string<T extends string>(): StringSchema<T> {
	return createSchema({
		type: 'S',
		marshall: value => ({ S: value }),
		unmarshall: value => value.S as T,
		// validate: value => typeof value === 'string',
		validateInput: value => typeof value === 'string',
		validateOutput: value => {
			return !!('S' in value && typeof value.S === 'string')
		},
	})
}
