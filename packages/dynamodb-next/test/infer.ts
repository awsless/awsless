import { BigFloat, ONE } from '@awsless/big-float'
import { UUID } from 'crypto'
import {
	any,
	array,
	bigfloat,
	bigint,
	boolean,
	date,
	define,
	enum_,
	Infer,
	json,
	number,
	object,
	optional,
	query,
	record,
	set,
	string,
	tuple,
	uint8array,
	unknown,
	updateItem,
	uuid,
} from '../src'

describe('Infer', () => {
	enum Status {
		OK,
		FAIL,
	}
	const posts = define('posts', {
		hash: 'string',
		sort: 'number',
		schema: object({
			any: any(),
			unknown: unknown(),

			number: number(),
			bigint: bigint(),
			bigfloat: bigfloat(),
			date: date(),

			uuid: uuid(),
			string: string(),
			stringNarrow: string<'open' | 'closed'>(),
			json: json<{ id: number }>(),
			optional: optional(string()),
			enum: enum_(Status),

			boolean: boolean(),

			binary: uint8array(),

			tuple: tuple([string(), number()]),
			tupleRest: tuple([string(), string()], number()),
			array: array(string()),
			record: record(string()),

			sets: object({
				string: set(string()),
				number: set(number()),
				// binary: set(binary()),
			}),
		}),
	})

	it('infer type check', () => {
		type Type = Infer<typeof posts>
		type Expectation = {
			any?: any
			unknown?: unknown

			number: number
			bigint: bigint
			bigfloat: BigFloat
			date: Date

			uuid: UUID
			string: string
			stringNarrow: 'open' | 'closed'
			json: { id: number }
			optional?: string
			enum: Status

			boolean: boolean

			binary: Uint8Array

			tuple: [string, number]
			tupleRest: [string, string, ...number[]]
			array: string[]
			record: Record<string, string>

			sets: {
				string: Set<string>
				number: Set<number>
			}
		}

		expectTypeOf<Type>().toEqualTypeOf<Expectation>()
	})

	it('infer correct update expression', () => {
		query(
			posts,
			{ string: 'test' },
			{
				where: e => [e.number.between(1, 2)],
			}
		)

		updateItem(
			posts,
			{ string: 'test', number: 1 },
			{
				update: e => [
					// any
					e.any.set('anything'),
					e.any.set(e.any),
					e.any.setIfNotExists('anything'),
					e.any.delete(),

					// unknown
					e.any.set('anything'),
					e.any.setIfNotExists('anything'),
					e.any.delete(),

					// number
					e.number.set(1),
					e.number.incr(1, 0),
					e.number.decr(1, 0),

					e.number.incr(e.number, 0),
					e.number.incr(e.number, e.number),
					e.number.decr(e.number, 0),
					e.number.decr(e.number, e.number),

					// bigint
					e.bigint.set(1n),
					e.bigint.incr(1n),
					e.bigint.decr(1n),

					// bigfloat
					e.bigfloat.set(1),
					e.bigfloat.set(1n),
					e.bigfloat.set(ONE),
					e.bigfloat.incr(ONE),
					e.bigfloat.decr(ONE),

					// date
					e.date.set(new Date()),
					// e.date.incr(new Date()),
					// e.date.decr(new Date()),

					// string
					e.string.set('test'),

					// uuid
					e.uuid.set('0-0-0-0-0'),

					// narrow string
					e.stringNarrow.set('open'),
					e.stringNarrow.set('closed'),

					// json
					e.json.set({ id: 1 }),

					// enum
					e.enum.set(Status.OK),
					e.enum.set(Status.FAIL),

					// optional
					e.optional.set('test'),
					e.optional.set(undefined),
					e.optional.setIfNotExists('test'),
					e.optional.setIfNotExists(undefined),
					e.optional.delete(),

					// boolean
					e.boolean.set(true),

					// binary
					e.binary.set(new Uint8Array()),

					// record
					e.record.set({ key: 'test' }),
					e.record.key!.set('test'),
					e.record['key']!.set('test'),
					e.record.at('key').set('test'),

					// array
					e.array.set(['test']),
					e.array.push('test'),
					e.array.push(e.array.at(0)),
					e.array.at(0).set('test'),
					e.array.at(1).set('test'),

					// tuple
					e.tuple.set(['test', 1]),
					// e.tuple.push(['test', 1]),
					e.tuple.at(0).set('test'),
					e.tuple.at(1).set(1),
					// e.tuple.at(2).set(1),
					// e.tuple.push(1),
					// e.tuple.push('test'),

					// tuple with rest
					e.tupleRest.set(['foo', 'bar', 1, 2, 3]),
					e.tupleRest.at(0).set('test'),
					e.tupleRest.at(1).set('test'),
					e.tupleRest.at(2).set(1),
					e.tupleRest.at(3).set(1),

					// sets
					e.sets.number.set(new Set([1, 2, 3])),
					e.sets.number.append(new Set([1])),
					e.sets.number.remove(new Set([1])),
					e.sets.number.append(e.sets.number),
					e.sets.number.remove(e.sets.number),

					e.sets.string.set(new Set(['test'])),
					e.sets.string.append(new Set(['test'])),
					e.sets.string.remove(new Set(['test'])),
					e.sets.string.append(e.sets.string),
					e.sets.string.remove(e.sets.string),
				],

				when: e => [
					// any
					e.any.eq('anything'),
					e.any.nq('anything'),
					e.any.exists(),
					e.any.notExists(),
					e.any.type('S'),
					e.any.type('N'),
					e.any.type('B'),
					e.any.eq(e.any),

					// unknown
					e.unknown.eq('anything'),
					e.unknown.nq('anything'),
					e.unknown.exists(),
					e.unknown.notExists(),
					e.unknown.type('S'),
					e.unknown.type('N'),
					e.unknown.type('B'),

					// number
					e.number.eq(1),
					e.number.nq(1),
					e.number.gt(1),
					e.number.gte(1),
					e.number.lt(1),
					e.number.lte(1),
					e.number.between(1, 2),
					e.number.exists(),
					e.number.notExists(),
					e.number.type('N'),

					e.number.eq(e.number),
					e.number.nq(e.number),
					e.number.gt(e.number),
					e.number.gte(e.number),
					e.number.lt(e.number),
					e.number.lte(e.number),
					e.number.between(e.number, 1),
					e.number.between(e.number, e.number),

					// bigint
					e.bigint.eq(1n),
					e.bigint.nq(1n),
					e.bigint.gt(1n),
					e.bigint.gte(1n),
					e.bigint.lt(1n),
					e.bigint.lte(1n),
					e.bigint.between(1n, 2n),
					e.bigint.exists(),
					e.bigint.notExists(),
					e.bigint.type('N'),

					// bigfloat
					e.bigfloat.eq(1n),
					e.bigfloat.nq(1n),
					e.bigfloat.gt(1n),
					e.bigfloat.gte(1n),
					e.bigfloat.lt(1n),
					e.bigfloat.lte(1n),
					e.bigfloat.between(1n, 2n),
					e.bigfloat.exists(),
					e.bigfloat.notExists(),
					e.bigfloat.type('N'),

					// date
					e.date.eq(new Date()),
					e.date.nq(new Date()),
					e.date.gt(new Date()),
					e.date.gte(new Date()),
					e.date.lt(new Date()),
					e.date.lte(new Date()),
					e.date.between(new Date(), new Date()),
					e.date.exists(),
					e.date.notExists(),
					e.date.type('N'),

					// string
					e.string.eq('test'),
					e.string.nq('test'),
					e.string.in(['test']),
					e.string.contains('test'),
					e.string.startsWith('test'),
					e.string.exists(),
					e.string.notExists(),
					e.string.type('S'),

					// uuid
					e.uuid.eq('0-0-0-0-0'),
					e.uuid.nq('0-0-0-0-0'),
					e.uuid.in(['0-0-0-0-0']),
					e.uuid.contains('-0-'),
					e.uuid.startsWith('0-'),
					e.uuid.exists(),
					e.uuid.notExists(),
					e.uuid.type('S'),

					// json
					e.json.eq({ id: 1 }),
					e.json.nq({ id: 1 }),
					e.json.exists(),
					e.json.notExists(),
					e.json.type('S'),

					// enum
					e.enum.eq(Status.OK),
					e.enum.nq(Status.OK),
					e.enum.exists(),
					e.enum.notExists(),
					e.enum.type('N'),

					// optional
					e.optional.eq('test'),
					e.optional.nq('test'),
					e.optional.in(['test']),
					e.optional.contains('test'),
					e.optional.startsWith('test'),
					e.optional.exists(),
					e.optional.notExists(),
					e.optional.type('S'),

					// boolean
					e.boolean.eq(true),
					e.boolean.nq(true),
					e.boolean.exists(),
					e.boolean.notExists(),
					e.boolean.type('BOOL'),

					// binary
					e.binary.eq(new Uint8Array()),
					e.binary.nq(new Uint8Array()),
					e.binary.exists(),
					e.binary.notExists(),
					e.binary.type('B'),

					// record
					e.record.eq({ key: 'test' }),
					e.record.nq({ key: 'test' }),
					e.record.exists(),
					e.record.notExists(),
					e.record.type('M'),

					// record[key]
					e.record.at('key').eq('test'),
					e.record.at('key').nq('test'),
					e.record.at('key').exists(),
					e.record.at('key').notExists(),
					e.record.at('key').type('S'),

					// array
					e.array.eq(['test']),
					e.array.nq(['test']),
					e.array.contains(['test']),
					e.array.exists(),
					e.array.notExists(),
					e.array.type('L'),

					// array[0]
					e.array.at(0).eq('test'),

					// tuple
					e.tuple.eq(['test', 1]),
					e.tuple.nq(['test', 1]),
					e.tuple.contains(['test', 1]),
					e.tuple.exists(),
					e.tuple.notExists(),
					e.tuple.type('L'),

					// tuple[0]
					e.tuple.at(0).eq('test'),
					e.tuple.at(1).eq(1),
					// e.tuple.at(2).eq(1),

					// tuple with rest
					e.tupleRest.eq(['test', 'test', 1, 2, 3]),
					e.tupleRest.nq(['test', 'test', 1, 2, 3]),
					e.tupleRest.contains(['test', 'test', 1, 2, 3]),
					e.tupleRest.exists(),
					e.tupleRest.notExists(),
					e.tupleRest.type('L'),

					// tuple[0] with rest
					e.tupleRest.at(0).eq('test'),
					e.tupleRest.at(1).eq('test'),
					e.tupleRest.at(2).eq(1),
					e.tupleRest.at(3).eq(1),

					// sets
					e.sets.number.eq(new Set([1])),
					e.sets.number.nq(new Set([1])),
					e.sets.number.contains(new Set([1])),
					e.sets.number.exists(),
					e.sets.number.notExists(),
					e.sets.number.type('NS'),

					e.sets.string.eq(new Set(['test'])),
					e.sets.string.nq(new Set(['test'])),
					e.sets.string.contains(new Set(['test'])),
					e.sets.string.exists(),
					e.sets.string.notExists(),
					e.sets.string.type('SS'),
				],
			}
		)
	})
})
