import { BinaryExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type Uint8ArraySchema = BaseSchema<
	//
	'B',
	Uint8Array,
	BinaryExpression<Uint8Array>
>

export const uint8array = (): Uint8ArraySchema =>
	createSchema({
		type: 'B',
	})
