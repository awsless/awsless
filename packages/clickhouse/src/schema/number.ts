import { Schema } from './schema'

// Results carry 64-bit integers as plain numbers, so values past 2^53
// lose precision.
export type NumberType =
	| 'Float64'
	| 'Float32'
	| 'Int8'
	| 'Int16'
	| 'Int32'
	| 'Int64'
	| 'UInt8'
	| 'UInt16'
	| 'UInt32'
	| 'UInt64'

export const number = <T extends number = number>(type: NumberType = 'Float64') =>
	new Schema<number, T, T>(
		value => value,
		value => value as T,
		type
	)
