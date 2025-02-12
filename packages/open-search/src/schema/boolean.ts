import { Schema, SchemaProps } from './schema'

export const boolean = (props: SchemaProps = {}) =>
	new Schema<boolean, boolean, boolean>(
		value => value,
		value => value,
		{ type: 'boolean', ...props }
	)
