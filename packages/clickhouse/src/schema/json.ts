import { Schema } from './schema'

// Semi-structured data in ClickHouse's JSON type, which stores every path
// as its own column, so filtering on one stays fast.
export const json = <T extends Record<string, unknown>>() =>
	new Schema<T, T, T>(
		value => value,
		value => value,
		'JSON'
	)
