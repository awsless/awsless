import { BigFloat } from '@awsless/big-float'
import { parse, Serializable, stringify } from '../src'

describe('JSON', () => {
	describe('generic', () => {
		const complex = {
			date: new Date('2025-01-01'),
			bigint: BigInt(Number.MAX_SAFE_INTEGER) * 9999n,
			bigfloat: new BigFloat(100),
		}

		it('stringify', () => {
			const result = stringify(complex)
			expect(result).toBeTypeOf('string')
		})

		it('parse', () => {
			const result = parse(stringify(complex))
			expect(result).toStrictEqual(complex)
		})
	})

	describe('types', () => {
		const types = {
			date: {
				input: new Date('2025-01-01'),
				output: '{"$date":"2025-01-01T00:00:00.000Z"}',
			},
			bigint: {
				input: 1n,
				output: '{"$bigint":"1"}',
			},
			bigfloat: {
				input: new BigFloat(9.99),
				output: '{"$bigfloat":"9.99"}',
			},
		}

		for (const [type, entry] of Object.entries(types)) {
			it(type, () => {
				const json = stringify(entry.input)
				expect(json).toBe(entry.output)

				const result = parse(json)
				expect(result).toStrictEqual(entry.input)
			})
		}
	})

	it('extendable', () => {
		class Custom {
			readonly value

			constructor(value: string) {
				this.value = value
			}
		}

		const $custom: Serializable<Custom> = {
			is: v => v instanceof Custom,
			parse: v => new Custom(v),
			stringify: v => v.value,
		}

		const value = new Custom('hello world')
		const json = stringify(value, { $custom })
		expect(json).toBe(`{"$custom":"hello world"}`)

		const result = parse(json, { $custom })
		expect(result).toStrictEqual(value)
	})
})
