import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
import { binary } from '../binary'
import { SetStruct } from './struct'

export const binarySet = () =>
	new SetStruct<NativeAttributeBinary[], Set<NativeAttributeBinary>, Set<Uint8Array>>(
		'BS',
		value => Array.from(value),
		value => new Set(value) as Set<Uint8Array>,
		() => binary()
	)
