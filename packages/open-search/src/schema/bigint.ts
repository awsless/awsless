import { Schema, SchemaProps } from './schema'

export const bigint = (props: SchemaProps = {}) =>
	new Schema<string, bigint, bigint>(
		value => value.toString(),
		value => BigInt(value),
		{ type: 'long', ...props }
	)
