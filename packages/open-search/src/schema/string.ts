import { Schema, SchemaProps } from './schema'

export const string = <T extends string>(props: SchemaProps = {}) =>
	new Schema<string, T, T>(
		value => value,
		value => value as T,
		{ type: 'keyword', ...props }
	)
