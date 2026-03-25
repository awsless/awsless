import { array, GenericSchema, map, number, object, pipe, record, set, string, union } from 'valibot'
import { applyRedaction, redact } from '../../src'

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
})
