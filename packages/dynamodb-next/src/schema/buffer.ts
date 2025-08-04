import { BinaryExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BufferSchema = BaseSchema<
	//
	'B',
	Buffer,
	BinaryExpression<Buffer>
>

export const buffer = (): BufferSchema =>
	createSchema({
		type: 'B',
		decode(value) {
			return Buffer.from(value)
		},
	})
