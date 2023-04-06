
import { BigFloat } from '@awsless/big-float'
import { define, number, object, string, date, putItem, mockDynamoDB, array, bigfloat, bigint, binary, unknown, boolean, bigintSet, stringSet, numberSet, binarySet, getItem, updateItem, record, optional } from '../src'
// import { enums } from '../src/structs/__enums'

describe('Types', () => {

	// const lol = enums(['foo', 'bar'])

	const obj1 = string()
	const obj2 = array(string())
	const obj3 = { s: string() }
	const obj4 = object({
		key1: string(),
		key2: string()
	})

	const table = define('table', {
		hash: 'key',
		schema: object({
			key: number(),
			number: number(),
			string: string(),
			enum: string<'foo' | 'bar'>(),
			bigint: bigint(),
			bigfloat: bigfloat(),
			boolean: boolean(),
			binary: binary(),
			date: date(),
			optional: optional(string()),
			unknown: unknown(),
			array: array(object({
				key: string(),
			})),
			record: record(object({
				key: string(),
			})),
			sets: object({
				string: stringSet(),
				number: numberSet(),
				bigint: bigintSet(),
				binary: binarySet(),
			}),
		}),
	})

	mockDynamoDB({ tables: [ table ] })

	const bytes = new Int8Array(5).fill(1)

	const item = {
		key: 1,
		number: 1,
		string: '1',
		// enum: 'foo',
		bigint: 1n,
		bigfloat: new BigFloat(1),
		boolean: true,
		binary: bytes,
		date: new Date(),
		optional: '1',
		unknown: { random: 1 },
		array: [ { key: '1' } ],
		record: {
			key1: { key: '1' },
			key2: { key: '1' },
		},
		sets: {
			string: new Set([ '1' ]),
			number: new Set([ 1 ]),
			bigint: new Set([ 1n ]),
			binary: new Set([ bytes ]),
		},
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { key: 1 })

		// result!.enum

		expectTypeOf(result!.number).toBeNumber()
		expectTypeOf(result!.string).toBeString()
		expectTypeOf(result!.bigint).toEqualTypeOf<bigint>()
		expectTypeOf(result!.bigfloat).toEqualTypeOf<BigFloat>()
		expectTypeOf(result!.boolean).toBeBoolean()
		expectTypeOf(result!.binary).toEqualTypeOf<Uint8Array>()
		expectTypeOf(result!.date).toEqualTypeOf<Date>()
		expectTypeOf(result!.unknown).toBeUnknown()
		expectTypeOf(result!.optional).toEqualTypeOf<string | undefined>()
		expectTypeOf(result!.array).toEqualTypeOf<{ key: string }[]>()
		expectTypeOf(result!.record).toEqualTypeOf<Record<string, { key:string }>>()
		expectTypeOf(result!.sets.string).toEqualTypeOf<Set<string>>()
		expectTypeOf(result!.sets.number).toEqualTypeOf<Set<number>>()
		expectTypeOf(result!.sets.bigint).toEqualTypeOf<Set<bigint>>()
		expectTypeOf(result!.sets.binary).toEqualTypeOf<Set<Uint8Array>>()

		expect(result).toStrictEqual({
			...item,
			binary: new Uint8Array(bytes),
			sets: {
				...item.sets,
				binary: new Set([ new Uint8Array(bytes) ]),
			}
		})
	})

	it('update', async () => {
		const bytes = new Uint8Array(5).fill(2)
		const date = new Date()

		const result = await updateItem(table, { key: 1 }, {
			return: 'ALL_NEW',
			update: (exp) => exp
				.update('number').set(2)
				.update('string').set('2')
				.update('bigint').set(2n)
				.update('bigfloat').set(new BigFloat(2))
				.update('boolean').set(false)
				.update('binary').set(bytes)
				.update('date').set(date)
				.update('optional').del()
				.update('unknown').set({ random: 2 })
				.update('array', 0).set({ key: '2' })
				.update('record', 'key1').set({ key: '2' })
				.update('record', 'key2').set({ key: '2' })
				.update('sets', 'string').set(new Set([ '2' ]))
				.update('sets', 'number').set(new Set([ 2 ]))
				.update('sets', 'bigint').set(new Set([ 2n ]))
				.update('sets', 'binary').set(new Set([ bytes ]))
		})

		expect(result).toStrictEqual({
			key: 1,
			number: 2,
			string: '2',
			bigint: 2n,
			bigfloat: new BigFloat(2),
			boolean: false,
			binary: bytes,
			date,
			unknown: { random: 2 },
			array: [ { key: '2' } ],
			record: {
				key1: { key: '2' },
				key2: { key: '2' },
			},
			sets: {
				string: new Set([ '2' ]),
				number: new Set([ 2 ]),
				bigint: new Set([ 2n ]),
				binary: new Set([ bytes ]),
			},
		})
	})
})
