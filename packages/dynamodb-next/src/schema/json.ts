import { parse, stringify } from '@awsless/json'
import { JsonExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type JsonSchema<T = unknown> = BaseSchema<'S', T, JsonExpression<T>>

// export const json = <T = unknown>(): JsonSchema<T> =>
// 	createSchema({
// 		type: 'S',
// 		encode: value => stringify(value),
// 		decode: value => parse(value) as T,
// 	})

export const json = <T = unknown>(): JsonSchema<T> =>
	createSchema({
		name: 'json',
		type: 'S',
		marshall: value => ({ S: stringify(value) }),
		unmarshall: value => parse(value.S) as T,
		validateInput: () => true,
		validateOutput: value => !!('S' in value && typeof value.S === 'string'),
	})
