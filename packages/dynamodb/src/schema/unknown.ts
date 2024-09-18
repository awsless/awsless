import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { Schema } from './schema'

type Options = marshallOptions & unmarshallOptions

export const unknown = (opts: Options) =>
	new Schema<unknown, unknown>(
		value => marshall({ value }, opts).value,
		value => unmarshall({ value: value as any }, opts).value
	)
