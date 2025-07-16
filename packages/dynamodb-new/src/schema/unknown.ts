import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { createSchema, Types } from './schema'

export type UnknownOptions = {
	marshall?: marshallOptions
	unmarshall?: unmarshallOptions
}

export const unknown = (opts?: UnknownOptions) =>
	createSchema<Types, unknown, unknown>({
		marshall(value) {
			return marshall(
				{ value },
				{
					removeUndefinedValues: true,
					...(opts?.marshall ?? {}),
				}
			).value as Record<Types, any>
		},
		unmarshall(value) {
			if (typeof value === 'undefined') {
				return
			}

			return unmarshall({ value: value as any }, opts?.unmarshall).value
		},
	})
