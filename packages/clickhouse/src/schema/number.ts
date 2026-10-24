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

// One per ClickHouse number type, so a schema reads like its table.
const of =
	(type: NumberType) =>
	<T extends number = number>() =>
		number<T>(type)

export const float32 = of('Float32')
export const float64 = of('Float64')
export const int8 = of('Int8')
export const int16 = of('Int16')
export const int32 = of('Int32')
export const int64 = of('Int64')
export const uint8 = of('UInt8')
export const uint16 = of('UInt16')
export const uint32 = of('UInt32')
export const uint64 = of('UInt64')
