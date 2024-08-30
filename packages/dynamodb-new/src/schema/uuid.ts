import { UUID } from 'node:crypto'
import { Schema } from './schema'

export const uuid = () =>
	new Schema<'S', UUID, UUID>(
		'S',
		value => ({ S: value }),
		value => value?.S as UUID
	)
