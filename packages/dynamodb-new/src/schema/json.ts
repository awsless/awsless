import { parse, stringify } from '@awsless/json'
import { createSchema } from './schema'

export const json = <T = unknown>() =>
	createSchema<'S', T, T>({
		type: 'S',
		encode: value => stringify(value),
		decode: value => parse(value) as T,
	})
