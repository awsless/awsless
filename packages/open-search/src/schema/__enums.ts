import { SchemaProps, Struct } from './schema'

export const enums = <T extends string>(props: SchemaProps = {}) =>
	new Struct<string, T, T>(
		value => value,
		value => value as T,
		{ type: 'text' }
	)
