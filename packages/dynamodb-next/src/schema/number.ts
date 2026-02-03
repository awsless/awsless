import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type NumberSchema<T extends number = number> = BaseSchema<'N', T, NumberExpression<T>>

// export function number(): NumberSchema
// export function number<T extends number>(): NumberSchema<T>
// export function number<T extends number>(): NumberSchema {
// 	return createSchema({
// 		type: 'N',
// 		encode: value => value.toString(),
// 		decode: value => Number(value) as T,
// 		validate: value => typeof value === 'number',
// 	})
// }

export function number(): NumberSchema
export function number<T extends number>(): NumberSchema<T>
export function number<T extends number>(): NumberSchema {
	return createSchema({
		type: 'N',
		marshall: value => ({ N: value.toString() }),
		unmarshall: value => Number(value.N) as T,
		// validate: value => typeof value === 'number',
		validateInput: value => typeof value === 'number',
		validateOutput: value => !!('N' in value && typeof value.N === 'string'),
	})
}
