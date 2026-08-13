import { UUID } from 'node:crypto'
import { Schema } from './schema'

export const uuid = () =>
	new Schema<UUID, UUID>(
		value => ({ S: value }),
		value => value.S as UUID
	)
