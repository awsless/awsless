import { Schema } from './schema'

export type StringProps = {
	// Dictionary encoded, for values that repeat a lot like country codes
	// or ids of a few thousand projects.
	lowCardinality?: boolean
}

export const string = <T extends string = string>(props: StringProps = {}) =>
	new Schema<string, T, T>(
		value => value,
		value => value as T,
		props.lowCardinality ? 'LowCardinality(String)' : 'String'
	)
