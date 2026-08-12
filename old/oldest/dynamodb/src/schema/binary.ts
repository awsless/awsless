import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
import { Schema } from './schema'

export const binary = () =>
	new Schema<NativeAttributeBinary, Uint8Array>(
		value => ({ B: value as Uint8Array }),
		value => value.B
	)
