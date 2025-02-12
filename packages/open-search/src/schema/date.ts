import { Schema, SchemaProps } from './schema'

export const date = (props: SchemaProps = {}) =>
	new Schema<string, Date, Date>(
		value => value.toISOString(),
		value => new Date(value),
		{ type: 'date', ...props }
	)
