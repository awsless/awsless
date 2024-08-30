import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { Schema, Types } from './schema'

type Options = marshallOptions & unmarshallOptions

export const any = (opts?: Options) =>
	new Schema<Types, any, any>(
		undefined,
		value => marshall({ value }, opts).value as any,
		value => unmarshall({ value: value as any }, opts).value
	)
