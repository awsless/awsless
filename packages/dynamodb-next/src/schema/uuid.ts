import { UUID } from 'node:crypto'
import { StringExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type UuidSchema = BaseSchema<'S', UUID, StringExpression<UUID>>

export const uuid = (): UuidSchema =>
	createSchema({
		type: 'S',
	})
