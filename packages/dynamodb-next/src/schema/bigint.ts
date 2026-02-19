import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BigIntSchema<T extends bigint = bigint> = BaseSchema<'N', T, NumberExpression<T>>

// export function bigint(): BigIntSchema
// export function bigint<T extends bigint>(): BigIntSchema<T>
// export function bigint<T extends bigint>(): BigIntSchema<T> {
// 	return createSchema({
// 		type: 'N',
// 		encode: value => value.toString(),
// 		decode: value => BigInt(value) as T,
// 		validate: value => typeof value === 'bigint',
// 	})
// }

export function bigint(): BigIntSchema
export function bigint<T extends bigint>(): BigIntSchema<T>
export function bigint<T extends bigint>(): BigIntSchema<T> {
	return createSchema({
		name: 'bigint',
		type: 'N',
		marshall: value => ({ N: value.toString() }),
		unmarshall: value => BigInt(value.N) as T,
		// validate: value => typeof value === 'bigint',
		validateInput: value => typeof value === 'bigint',
		validateOutput: value => !!('N' in value && typeof value.N === 'string'),
	})
}
