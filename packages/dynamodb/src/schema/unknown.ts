import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { UnknownExpression } from '../expression/types'
import { AttributeType, BaseSchema, createSchema } from './schema'

export type UnknownOptions = {
	marshall?: marshallOptions
	unmarshall?: unmarshallOptions
}

export type UnknownSchema = BaseSchema<AttributeType, unknown, UnknownExpression<unknown>>

// export const unknown = (opts?: UnknownOptions): UnknownSchema =>
// 	createSchema({
// 		marshall(value) {
// 			// if (typeof value === 'undefined') {
// 			// 	return
// 			// }

// 			return marshall(
// 				{ value },
// 				{
// 					removeUndefinedValues: true,
// 					...(opts?.marshall ?? {}),
// 				}
// 			).value as Record<AttributeType, any>
// 		},
// 		unmarshall(value) {
// 			if (typeof value === 'undefined') {
// 				return
// 			}

// 			return unmarshall({ value: value as any }, opts?.unmarshall).value
// 		},
// 	})

export const unknown = (opts?: UnknownOptions): UnknownSchema =>
	createSchema({
		name: 'unknown',
		// validate: () => true,
		marshall(value) {
			// if (typeof value === 'undefined') {
			// 	return
			// }

			return marshall(
				{ value },
				{
					removeUndefinedValues: true,
					...(opts?.marshall ?? {}),
				}
			).value as Record<AttributeType, any>
		},
		unmarshall(value) {
			if (typeof value === 'undefined') {
				return
			}

			return unmarshall({ value: value as any }, opts?.unmarshall).value
		},
		validateInput: () => true,
		validateOutput: () => true,
	})
