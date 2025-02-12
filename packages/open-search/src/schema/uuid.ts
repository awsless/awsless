import { UUID } from 'node:crypto'
import { Schema, SchemaProps } from './schema'

export const uuid = (props: SchemaProps = {}) =>
	new Schema<UUID, UUID, UUID>(
		value => value,
		value => value,
		{ type: 'keyword', ...props }
	)
