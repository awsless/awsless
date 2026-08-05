import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
import { Schema } from './schema'

export const binary = () =>
	new Schema<'B', NativeAttributeBinary, Uint8Array>(
		'B',
		value => ({ B: value }),
		value => value.B
	)
