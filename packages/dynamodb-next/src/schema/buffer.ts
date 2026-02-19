import { isUint8Array } from 'node:util/types'
import { BinaryExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BufferSchema = BaseSchema<
	//
	'B',
	Buffer,
	BinaryExpression<Buffer>
>

// export const buffer = (): BufferSchema =>
// 	createSchema({
// 		type: 'B',
// 		decode: value => Buffer.from(value),
// 		validate: value => Buffer.isBuffer(value),
// 	})

export const buffer = (): BufferSchema =>
	createSchema({
		name: 'buffer',
		type: 'B',
		marshall: value => ({ B: value }),
		unmarshall: value => Buffer.from(value.B),
		// validate: value => Buffer.isBuffer(value),
		validateInput: value => Buffer.isBuffer(value),
		validateOutput: value => !!('B' in value && isUint8Array(value.B)),
	})
