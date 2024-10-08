import { BigFloat } from '@awsless/big-float'
import { randomUUID, UUID } from 'crypto'
import {
	any,
	array,
	bigfloat,
	bigint,
	bigintSet,
	binary,
	binarySet,
	boolean,
	date,
	define,
	getItem,
	mockDynamoDB,
	number,
	numberEnum,
	numberSet,
	object,
	optional,
	putItem,
	record,
	string,
	stringEnum,
	stringSet,
	ttl,
	unknown,
	updateItem,
	uuid,
} from '../src'
// import { any } from '../src/structs/any'
// import { AttributeTypes } from '../src/structs/struct'
// import { CATCH_ALL } from '../src/structs/object'
enum StringEnum {
	one = '1',
	two = '2',
}

enum NumberEnum {
	one = 1,
	two = 2,
}

describe('Schema', () => {
	// const obj1 = string()
	// const obj2 = array(string())
	// const obj3 = { s: string() }
	// const obj4 = object({
	// 	key1: string(),
	// 	key2: string()
	// })

	const table = define('table', {
		hash: 'key',
		schema: object({
			id: uuid(),
			key: number(),
			number: number(),
			string: string(),
			string2: string<'foo' | 'bar'>(),
			stringEnum: stringEnum(StringEnum),
			numberEnum: numberEnum(NumberEnum),

			// numberEnum: numberEnum(NumEnum),
			// enums: enums<'foo' | 'bar'>(),
			bigint: bigint(),
			bigfloat: bigfloat(),
			boolean: boolean(),
			binary: binary(),
			date: date(),
			ttl: ttl(),
			optional: optional(string()),
			unknown: unknown(),
			unknown2: unknown(),
			array: array(
				object({
					key: string(),
				})
			),
			record: record(
				object({
					key: string(),
				})
			),
			any: any(),
			sets: object({
				empty: stringSet(),
				string: stringSet(),
				number: numberSet(),
				bigint: bigintSet(),
				binary: binarySet(),
			}),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const id = randomUUID()
	const now = new Date()
	const bytes = new Int8Array(5).fill(1)

	const item = {
		id,
		key: 1,
		number: 1,
		string: '1',
		string2: 'foo' as const,
		// enum: new Date(),
		stringEnum: StringEnum.one,
		numberEnum: NumberEnum.one,
		bigint: 1n,
		bigfloat: new BigFloat(1),
		boolean: true,
		binary: bytes,
		date: now,
		ttl: now,
		optional: '1',
		unknown: { random: 1 },
		unknown2: undefined,
		array: [{ key: '1' }],
		record: {
			key1: { key: '1' },
			key2: { key: '1' },
		},
		any: { id: 1 },
		sets: {
			empty: new Set<string>(),
			string: new Set(['1']),
			number: new Set([1]),
			bigint: new Set([1n]),
			binary: new Set([bytes]),
		},
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { key: 1 })

		expectTypeOf(result!.id).toEqualTypeOf<UUID>()
		expectTypeOf(result!.number).toEqualTypeOf<number>()
		expectTypeOf(result!.string).toEqualTypeOf<string>()
		expectTypeOf(result!.string2).toEqualTypeOf<'foo' | 'bar'>()
		expectTypeOf(result!.stringEnum).toEqualTypeOf<StringEnum>()
		expectTypeOf(result!.numberEnum).toEqualTypeOf<NumberEnum>()
		expectTypeOf(result!.bigint).toEqualTypeOf<bigint>()
		expectTypeOf(result!.bigfloat).toEqualTypeOf<BigFloat>()
		expectTypeOf(result!.boolean).toEqualTypeOf<boolean>()
		expectTypeOf(result!.binary).toEqualTypeOf<Uint8Array>()
		expectTypeOf(result!.date).toEqualTypeOf<Date>()
		expectTypeOf(result!.ttl).toEqualTypeOf<Date>()
		expectTypeOf(result!.unknown).toEqualTypeOf<unknown>()
		expectTypeOf(result!.unknown2).toEqualTypeOf<unknown>()
		expectTypeOf(result!.optional).toEqualTypeOf<string | undefined>()
		expectTypeOf(result!.array).toEqualTypeOf<{ key: string }[]>()
		expectTypeOf(result!.record).toEqualTypeOf<Record<string, { key: string }>>()
		expectTypeOf(result!.any).toBeAny()
		expectTypeOf(result!.sets).toBeObject()
		expectTypeOf(result!.sets.empty).toEqualTypeOf<Set<string>>()
		expectTypeOf(result!.sets.string).toEqualTypeOf<Set<string>>()
		expectTypeOf(result!.sets.number).toEqualTypeOf<Set<number>>()
		expectTypeOf(result!.sets.bigint).toEqualTypeOf<Set<bigint>>()
		expectTypeOf(result!.sets.binary).toEqualTypeOf<Set<Uint8Array>>()

		delete item.unknown2

		expect(result).toStrictEqual({
			...item,
			// unknown2: expect.not.set()
			binary: new Uint8Array(bytes),
			ttl: new Date(Math.floor(now.getTime() / 1000) * 1000),
			sets: {
				...item.sets,
				binary: new Set([new Uint8Array(bytes)]),
			},
		})
	})

	it('update', async () => {
		const bytes = new Uint8Array(5).fill(2)
		const date = new Date()

		const result = await updateItem(
			table,
			{ key: 1 },
			{
				return: 'ALL_NEW',
				update: exp =>
					exp
						.update('id')
						.set('0-0-0-0-0')
						.update('number')
						.set(2)
						.update('string')
						.set('2')
						.update('string2')
						.set('bar')
						.update('stringEnum')
						.set(StringEnum.two)
						.update('numberEnum')
						.set(NumberEnum.two)
						.update('bigint')
						.set(2n)
						.update('bigfloat')
						.set(new BigFloat(2))
						.update('boolean')
						.set(false)
						.update('binary')
						.set(bytes)
						.update('date')
						.set(date)
						.update('ttl')
						.set(date)
						.update('optional')
						.del()
						.update('unknown')
						.set({ random: 2 })
						.update('unknown2')
						.set(undefined)
						.update('array', 0)
						.set({ key: '2' })
						.update('record', 'key1')
						.set({ key: '2' })
						.update('record', 'key2')
						.set({ key: '2' })
						.update('any')
						// .set({ M: { id: { S: '2' } } })
						.set({ id: 2 })
						.update('sets', 'empty')
						.append(new Set(['foo']))
						.update('sets', 'string')
						.set(new Set(['2']))
						.update('sets', 'number')
						.set(new Set([2]))
						.update('sets', 'bigint')
						.set(new Set([2n]))
						.update('sets', 'binary')
						.set(new Set([bytes])),
			}
		)

		expect(result).toStrictEqual({
			id: '0-0-0-0-0',
			key: 1,
			number: 2,
			string: '2',
			string2: 'bar',
			stringEnum: StringEnum.two,
			numberEnum: NumberEnum.two,
			bigint: 2n,
			bigfloat: new BigFloat(2),
			boolean: false,
			binary: bytes,
			date,
			ttl: new Date(Math.floor(date.getTime() / 1000) * 1000),
			unknown: { random: 2 },
			// unknown2: undefined,
			array: [{ key: '2' }],
			record: {
				key1: { key: '2' },
				key2: { key: '2' },
			},
			// any: {
			// 	M: { id: { S: '2' } },
			// },
			any: { id: 2 },
			sets: {
				empty: new Set(['foo']),
				string: new Set(['2']),
				number: new Set([2]),
				bigint: new Set([2n]),
				binary: new Set([bytes]),
			},
		})
	})
})
