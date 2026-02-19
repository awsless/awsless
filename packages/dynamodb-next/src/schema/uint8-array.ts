import { isUint8Array } from 'node:util/types'
import { BinaryExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type Uint8ArraySchema = BaseSchema<
	//
	'B',
	Uint8Array,
	BinaryExpression<Uint8Array>
>

// export const uint8array = (): Uint8ArraySchema =>
// 	createSchema({
// 		type: 'B',
// 		validate: value => value instanceof Uint8Array,
// 	})

export const uint8array = (): Uint8ArraySchema =>
	createSchema({
		name: 'uint8array',
		type: 'B',
		marshall: value => ({ B: value }),
		unmarshall: value => value.B,
		// validate: value => value instanceof Uint8Array,
		validateInput: value => value instanceof Uint8Array,
		validateOutput: value => !!('B' in value && isUint8Array(value.B)),
	})
