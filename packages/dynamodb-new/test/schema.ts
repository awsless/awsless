import { BigFloat } from '@awsless/big-float'
import { randomUUID, UUID } from 'crypto'
import {
	any,
	array,
	bigfloat,
	bigint,
	binary,
	boolean,
	date,
	define,
	getItem,
	json,
	mockDynamoDB,
	number,
	numberEnum,
	object,
	optional,
	putItem,
	record,
	string,
	stringEnum,
	ttl,
	unknown,
	updateItem,
	uuid,
} from '../src'
import { set } from '../src/schema/set'

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

	// type Name = 'table' & {
	// 	hash: 'key'
	// 	hashType: 'S'
	// 	// ttlKey: 'ttl'
	// 	// indexes: Record<
	// 	// 	string,
	// 	// 	{
	// 	// 		hashKey: string
	// 	// 		hashType: 'S' | 'N' | 'B'
	// 	// 		sortKey?: string
	// 	// 		sortType?: 'S' | 'N' | 'B'
	// 	// 	}
	// 	// >
	// }

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

			bigint: bigint(),
			bigfloat: bigfloat(),
			boolean: boolean(),
			binary: binary(),
			date: date(),
			ttl: ttl(),
			optional: optional(string()),
			unknown: unknown(),
			unknown2: unknown(),
			json: json<{
				n: bigint
			}>(),
			array: array(
				object({
					key: string(),
				})
			),
			array2: array(string()),
			record: record(
				object({
					key: string(),
				})
			),
			any: any(),
			sets: object({
				// empty: stringSet(),
				// string: stringSet(),
				// number: numberSet(),
				// bigint: bigintSet(),
				// binary: binarySet(),

				empty: set(string()),
				string: set(string()),
				uuid: set(uuid()),
				json: set(json<{ n: bigint }>()),
				number: set(number()),
				bigint: set(bigint()),
				bigfloat: set(bigfloat()),
				date: set(date()),
				binary: set(binary()),
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
		json: { n: 1n },
		array: [{ key: '1' }],
		array2: ['hello'],
		record: {
			key1: { key: '1' },
			key2: { key: '1' },
		},
		any: { id: 1 },
		sets: {
			empty: new Set<string>(),
			string: new Set(['1']),
			uuid: new Set([id]),
			json: new Set([{ n: 1n }]),
			number: new Set([1]),
			bigint: new Set([1n]),
			bigfloat: new Set([new BigFloat(1)]),
			date: new Set([new Date()]),
			binary: new Set([bytes]),
		},
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { key: 1 })

		expectTypeOf(result).toEqualTypeOf<
			| undefined
			| {
					id: UUID
					key: number
					number: number
					string: string
					string2: 'foo' | 'bar'
					stringEnum: StringEnum
					numberEnum: NumberEnum
					bigint: bigint
					bigfloat: BigFloat
					boolean: boolean
					binary: Uint8Array
					date: Date
					ttl: Date
					unknown: unknown
					unknown2: unknown
					json: { n: bigint }
					optional?: string
					array: { key: string }[]
					array2: string[]
					record: Record<string, { key: string }>
					any: any
					sets: {
						empty: Set<string>
						string: Set<string>
						json: Set<{ n: 1n }>
						uuid: Set<UUID>
						number: Set<number>
						bigint: Set<bigint>
						bigfloat: Set<BigFloat>
						date: Set<Date>
						binary: Set<Uint8Array>
					}
			  }
		>()

		delete item.unknown2

		expect(result).toStrictEqual({
			...item,
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
						.update('json')
						.set({ n: 2n })
						.update('array', 0)
						.set({ key: '2' })
						.update('record', 'key1')
						.set({ key: '2' })
						.update('record', 'key2')
						.set({ key: '2' })
						.update('any')
						.set({ id: 2 })
						// .update('sets', 'empty')
						// .append(new Set(['foo']))
						.update('sets', 'empty')
						.set(new Set())
						.update('sets', 'string')
						.set(new Set(['2']))
						.update('sets', 'uuid')
						.set(new Set(['0-0-0-0-0']))
						.update('sets', 'json')
						.set(new Set([{ n: 2n }]))
						.update('sets', 'number')
						.set(new Set([2]))
						.update('sets', 'bigint')
						.set(new Set([2n]))
						.update('sets', 'bigfloat')
						.set(new Set([new BigFloat(2)]))
						.update('sets', 'date')
						.set(new Set([date]))
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
			json: { n: 2n },
			array: [{ key: '2' }],
			array2: ['hello'],
			record: {
				key1: { key: '2' },
				key2: { key: '2' },
			},
			any: { id: 2 },
			sets: {
				empty: new Set(),
				string: new Set(['2']),
				uuid: new Set(['0-0-0-0-0']),
				json: new Set([{ n: 2n }]),
				number: new Set([2]),
				bigint: new Set([2n]),
				bigfloat: new Set([new BigFloat(2)]),
				date: new Set([date]),
				binary: new Set([bytes]),
			},
		})
	})
})
