import { parse, stringify } from '@awsless/json'
import { Schema } from './schema'

export const json = <T = unknown>() =>
	new Schema<'S', T, T>(
		'S',
		value => ({ S: stringify(value) }),
		value => parse(value.S) as T
	)
