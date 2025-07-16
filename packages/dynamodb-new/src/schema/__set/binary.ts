import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
import { binary } from '../binary'
import { SetSchema } from './schema'

export const binarySet = () =>
	new SetSchema<'BS', Set<NativeAttributeBinary>, Set<Uint8Array>>(
		'BS',
		value => (value.size > 0 ? { BS: Array.from(value) } : undefined),
		value => new Set<Uint8Array>(value?.BS),
		() => binary()
	)
