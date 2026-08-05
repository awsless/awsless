import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { Schema, Types } from './schema'

type Options = {
	marshall?: marshallOptions
	unmarshall?: unmarshallOptions
}

export const unknown = (opts?: Options) =>
	new Schema<Types, unknown, unknown>(
		undefined,
		value =>
			marshall(
				{ value },
				{
					removeUndefinedValues: true,
					...(opts?.marshall ?? {}),
				}
			).value as any,
		value => {
			if (typeof value === 'undefined') {
				return
			}

			return unmarshall({ value: value as any }, opts?.unmarshall).value
		}
	)
