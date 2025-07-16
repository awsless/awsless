import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
import { createSchema } from './schema'

export const binary = () =>
	createSchema<'B', NativeAttributeBinary, Uint8Array>({
		type: 'B',
	})
