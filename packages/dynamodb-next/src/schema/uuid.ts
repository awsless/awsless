import { UUID } from 'node:crypto'
import { UuidExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type UuidSchema = BaseSchema<'S', UUID, UuidExpression<UUID>>

const regex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

// export const uuid = (): UuidSchema =>
// 	createSchema({
// 		type: 'S',
// 		validate: value => typeof value === 'string' && regex.test(value),
// 	})

export const uuid = (): UuidSchema =>
	createSchema({
		type: 'S',
		marshall: value => ({ S: value }),
		unmarshall: value => value.S as UUID,
		// validate: value => typeof value === 'string',
		// validate: value => typeof value === 'string' && regex.test(value),
		validateInput: value => typeof value === 'string' && regex.test(value),
		validateOutput: value => !!('S' in value && typeof value.S === 'string' && regex.test(value.S)),
	})
