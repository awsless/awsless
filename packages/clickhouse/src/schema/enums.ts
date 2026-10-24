import { quoteString } from '../param'
import { Schema } from './schema'

// Stored as a small number, read & written as the name. Adding a value
// later is an ALTER, so LowCardinality strings suit lists that grow.
export const enums = <const T extends string>(values: readonly T[]) =>
	new Schema<T, T, T>(
		value => value,
		value => value,
		`Enum8(${values.map((value, index) => `${quoteString(value)} = ${index + 1}`).join(', ')})`
	)
