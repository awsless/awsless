import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { Schema } from './schema'

type Options = marshallOptions & unmarshallOptions

export const any = (opts: Options) =>
	new Schema<any, any>(
		value => marshall({ value }, opts).value,
		value => unmarshall({ value: value as any }, opts).value
	)
