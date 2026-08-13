import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
import { binary } from '../binary'
import { Schema } from '../schema'

export const binarySet = () =>
	new Schema<Set<NativeAttributeBinary>, Set<Uint8Array>>(
		value => ({ BS: Array.from(value) }),
		value => new Set<Uint8Array>(value.BS),
		() => binary()
	)
