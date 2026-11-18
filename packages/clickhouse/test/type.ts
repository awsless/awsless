import { BigFloat } from '@awsless/big-float'
import { decodeValue, parseType, tupleFieldType, unwrapType } from '../src'

describe('clickhouse types', () => {
	it('reads a type into its name and what stands between its brackets', () => {
		expect(parseType('String')).toEqual({ name: 'String', args: [] })
		expect(parseType("DateTime64(3, 'UTC')")).toEqual({ name: 'DateTime64', args: ['3', "'UTC'"] })
		expect(parseType('Map(String, Array(Nullable(UInt32)))')).toEqual({
			name: 'Map',
			args: ['String', 'Array(Nullable(UInt32))'],
		})
		expect(parseType("Enum8('a, b' = 1, 'it\\'s' = 2)").args).toEqual(["'a, b' = 1", "'it\\'s' = 2"])
		expect(unwrapType(parseType('LowCardinality(Nullable(String))'))).toEqual({
			name: 'Nullable',
			args: ['String'],
		})
		expect(unwrapType(parseType('SimpleAggregateFunction(sum, UInt64)')).name).toBe('UInt64')
		expect(tupleFieldType('lat Float64')).toBe('Float64')
		expect(tupleFieldType('at DateTime64(3)')).toBe('DateTime64(3)')
		expect(tupleFieldType('DateTime64(3)')).toBe('DateTime64(3)')
	})

	it('reads a value by the type of its column', () => {
		expect(decodeValue('UInt64', '18446744073709551615')).toBe(18_446_744_073_709_551_615n)
		expect(decodeValue('Nullable(Int64)', null)).toBeNull()
		expect(decodeValue('Decimal(38, 10)', '0.1000000000')).toEqual(new BigFloat('0.1000000000'))
		expect(decodeValue("DateTime64(3, 'UTC')", '2026-11-18T10:30:00.123Z')).toEqual(
			new Date('2026-11-18T10:30:00.123Z')
		)
		expect(decodeValue('Date', '2026-11-18')).toBe('2026-11-18')
		expect(decodeValue('Array(Nullable(UInt64))', ['1', null])).toEqual([1n, null])
		expect(decodeValue('Map(String, Int64)', { a: '1' })).toEqual({ a: 1n })
		expect(decodeValue('Tuple(id UInt64, name String)', ['7', 'x'])).toEqual([7n, 'x'])
		// A tuple with names is an object by those names.
		expect(decodeValue('Tuple(id UInt64, name String)', { id: '7', name: 'x' })).toEqual({ id: 7n, name: 'x' })
		expect(decodeValue('LowCardinality(String)', 'x')).toBe('x')
		expect(decodeValue('UInt32', 5)).toBe(5)
	})
})
