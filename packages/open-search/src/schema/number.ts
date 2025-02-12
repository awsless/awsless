import { Schema, SchemaProps } from './schema'

export const number = (props: SchemaProps = {}) =>
	new Schema<string, number, number>(
		value => value.toString(),
		value => Number(value),
		{ type: 'double', ...props }
	)
