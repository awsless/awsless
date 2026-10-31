import {
	array,
	GenericSchema,
	lazy,
	looseObject,
	map,
	nullable,
	nullish,
	number,
	object,
	objectWithRest,
	optional,
	pipe,
	record,
	set,
	string,
	tuple,
	union,
} from 'valibot'
import { applyRedaction, json, redact, redactWith, sqsQueue } from '../../src'

const test = (schema: GenericSchema, input: any, output: any) => {
	it(`${JSON.stringify(input)} = ${JSON.stringify(output)}`, () => {
		const result = applyRedaction(schema, input)
		expect(result).toStrictEqual(output)
	})
}

const testPlainTypes = (schema: GenericSchema) => {
	const fn = () => {}
	test(schema, fn, fn)
	test(schema, new Error(), new Error())
	test(schema, new Set(), new Set())
	test(schema, new Map(), new Map())
	test(schema, {}, {})
	test(schema, [], [])
	test(schema, 0, 0)
	test(schema, 1, 1)
	test(schema, -1, -1)
	test(schema, true, true)
	test(schema, false, false)
	test(schema, null, null)
	test(schema, undefined, undefined)
	test(schema, Infinity, Infinity)
}

describe('redact', () => {
	describe('object', () => {
		const schema = object({
			username: string(),
			password: pipe(string(), redact()),
		})

		test(
			schema,
			{
				username: 'User',
				password: 'Pass',
			},
			{
				username: 'User',
				password: '[REDACTED]',
			}
		)
		testPlainTypes(schema)
	})

	describe('array', () => {
		const schema = array(pipe(string(), redact()))

		test(schema, ['secret'], ['[REDACTED]'])
		testPlainTypes(schema)
	})

	describe('union', () => {
		const schema = union([number(), pipe(string(), redact())])

		test(schema, 'password', '[REDACTED]')
		testPlainTypes(schema)
	})

	describe('record', () => {
		const schema = record(string(), pipe(string(), redact()))

		test(schema, { pass: 'password' }, { pass: '[REDACTED]' })
		testPlainTypes(schema)
	})

	describe('set', () => {
		const schema = set(pipe(string(), redact()))

		test(schema, new Set(['password']), new Set(['[REDACTED]']))
		testPlainTypes(schema)
	})

	describe('map', () => {
		const schema = map(string(), pipe(string(), redact()))

		test(schema, new Map([['pass', 'password']]), new Map([['pass', '[REDACTED]']]))
		testPlainTypes(schema)
	})

	describe('wrappers', () => {
		const schema = object({
			email: optional(pipe(string(), redact())),
			ip: nullable(pipe(string(), redact())),
			name: nullish(object({ first: pipe(string(), redact()) })),
		})

		test(
			schema,
			{ email: 'pat@example.com', ip: '192.0.2.1', name: { first: 'Pat' } },
			{ email: '[REDACTED]', ip: '[REDACTED]', name: { first: '[REDACTED]' } }
		)
	})

	describe('marked wrapper', () => {
		const schema = object({ token: pipe(optional(string()), redact()) })

		test(schema, { token: 'abc' }, { token: '[REDACTED]' })
	})

	describe('loose object', () => {
		const schema = looseObject({ password: pipe(string(), redact()) })

		test(schema, { password: 'pass', extra: 1 }, { password: '[REDACTED]', extra: 1 })
	})

	describe('object with rest', () => {
		const schema = objectWithRest({ id: string() }, pipe(string(), redact()))

		test(schema, { id: 'a', other: 'secret' }, { id: 'a', other: '[REDACTED]' })
	})

	describe('tuple', () => {
		const schema = tuple([string(), pipe(string(), redact())])

		test(schema, ['a', 'b'], ['a', '[REDACTED]'])
	})

	describe('lazy', () => {
		const schema = lazy(() => object({ secret: pipe(string(), redact()) }))

		test(schema, { secret: 'x' }, { secret: '[REDACTED]' })
	})

	describe('redactWith', () => {
		const schema = object({
			headers: pipe(
				record(string(), string()),
				redactWith(input =>
					Object.fromEntries(
						Object.entries(input as Record<string, string>).map(([name, value]) => [
							name,
							name === 'authorization' ? '[REDACTED]' : value,
						])
					)
				)
			),
		})

		test(
			schema,
			{ headers: { authorization: 'Bearer x', accept: '*/*' } },
			{ headers: { authorization: '[REDACTED]', accept: '*/*' } }
		)
	})

	describe('json', () => {
		const schema = object({ body: json(object({ id: string(), email: pipe(string(), redact()) })) })

		test(
			schema,
			{ body: '{"id":"1","email":"pat@example.com"}' },
			{ body: '{"id":"1","email":"[REDACTED]"}' }
		)
		test(schema, { body: 'not json' }, { body: 'not json' })
	})

	describe('sqs queue', () => {
		const schema = sqsQueue(object({ email: pipe(string(), redact()) }))

		test(
			schema,
			{ Records: [{ body: '{"email":"pat@example.com"}' }] },
			{ Records: [{ body: '{"email":"[REDACTED]"}' }] }
		)
	})
})
