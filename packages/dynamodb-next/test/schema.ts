import { BigFloat } from '@awsless/big-float'
import { randomUUID, UUID } from 'crypto'
import {
	any,
	array,
	bigfloat,
	bigint,
	boolean,
	date,
	define,
	enum_,
	getItem,
	Infer,
	json,
	mockDynamoDB,
	number,
	object,
	optional,
	putItem,
	record,
	set,
	string,
	ttl,
	tuple,
	uint8array,
	unknown,
	updateItem,
	uuid,
	variant,
} from '../src'

enum StringEnum {
	one = '1',
	two = '2',
}

enum NumberEnum {
	one = 1,
	two = 2,
}

describe('Schema', () => {
	const table = define('table', {
		hash: 'key',
		schema: object({
			id: uuid(),
			key: number(),
			number: number(),
			string: string(),
			string2: string<'foo' | 'bar'>(),
			stringEnum: enum_(StringEnum),
			numberEnum: enum_(NumberEnum),

			bigint: bigint(),
			bigfloat: bigfloat(),
			boolean: boolean(),
			binary: uint8array(),
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
			tuple: tuple(
				[
					string(),
					object({
						key: string(),
					}),
				],
				number()
			),
			object: object({
				key: string(),
			}),
			objectRest: object(
				{
					key: string(),
				},
				number()
			),
			record: record(
				object({
					key: string(),
				})
			),
			variant: variant('type', {
				one: object({ one: number() }),
				two: object({ two: number() }),
			}),
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
				binary: set(uint8array()),
			}),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const id = randomUUID()
	const now = new Date()
	const bytes = new Uint8Array(5).fill(1)

	const item: Infer<typeof table> = {
		id,
		key: 1,
		number: 1,
		string: '1',
		string2: 'foo' as const,
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
		tuple: ['hello', { key: '1' }, 1],
		object: {
			key: '1',
		},
		objectRest: {
			key: '1',
			n: 1,
		},
		record: {
			key1: { key: '1' },
			key2: { key: '1' },
		},
		variant: {
			type: 'one',
			one: 1,
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
					unknown?: unknown
					unknown2?: unknown
					json: { n: bigint }
					optional?: string
					array: { key: string }[]
					array2: string[]
					tuple: [string, { key: string }, ...number[]]
					object: { key: string }
					objectRest: { key: string; [key: string]: number | string }
					record: Record<string, { key: string }>
					variant: { type: 'one'; one: number } | { type: 'two'; two: number }
					any?: any
					sets: {
						empty?: Set<string>
						string?: Set<string>
						json?: Set<{ n: bigint }>
						uuid?: Set<UUID>
						number?: Set<number>
						bigint?: Set<bigint>
						bigfloat?: Set<BigFloat>
						date?: Set<Date>
						binary?: Set<Uint8Array>
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
				update: e => [
					e.setPartial({
						id: '0-0-0-0-0',
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
						ttl: date,
						unknown: { random: 2 },
						// unknown2: undefined,
						optional: undefined,
						json: { n: 2n },
						array: [{ key: '2' }],
						array2: ['hello'],
						tuple: ['world', { key: '2' }, 2],
						object: {
							key: '2',
						},
						objectRest: {
							key: '2',
							n: 2,
						},
						record: {
							key1: { key: '2' },
							key2: { key: '2' },
						},
						variant: {
							type: 'two',
							two: 2,
						},
						any: { id: 2 },
						sets: {
							empty: new Set<string>(),
							string: new Set(['2']),
							uuid: new Set<UUID>(['0-0-0-0-0']),
							json: new Set([{ n: 2n }]),
							number: new Set([2]),
							bigint: new Set([2n]),
							bigfloat: new Set([new BigFloat(2)]),
							date: new Set([date]),
							binary: new Set([bytes]),
						},
					}),
				],
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
			tuple: ['world', { key: '2' }, 2],
			object: {
				key: '2',
			},
			objectRest: {
				key: '2',
				n: 2,
			},
			record: {
				key1: { key: '2' },
				key2: { key: '2' },
			},
			variant: {
				type: 'two',
				two: 2,
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
