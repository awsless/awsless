import { BigFloat } from '@awsless/big-float'
import { parse, patch, Serializable, stringify } from '../src'

describe('JSON', () => {
	describe('basic', () => {
		const complex = {
			map: new Map([
				[1n, 'a'],
				[2n, 'b'],
				[3n, 'c'],
			]),
			set: new Set([1n, 2n, 3n]),
			date: new Date('2025-01-01'),
			bigint: BigInt(Number.MAX_SAFE_INTEGER) * 9999n,
			bigfloat: new BigFloat(100),

			// undefined: undefined, // Sadly this test will not work
			undefinedSet: new Set([undefined]),
			undefinedMap: new Map([[undefined, undefined]]),
			undefinedArray: [undefined],

			null: null,
			nullSet: new Set([null]),
			nullMap: new Map([[null, null]]),
			nullArray: [null],
		}

		it('stringify', () => {
			const result = stringify(complex)
			// console.log(result)
			expect(result).toBeTypeOf('string')
		})

		it('parse', () => {
			const result = parse(stringify(complex))
			// console.log(result)
			expect(result).toMatchObject(complex)
		})

		it('patch', () => {
			const broken = JSON.parse(stringify(complex))
			expect(broken).not.toMatchObject(complex)

			const fixed = patch(broken)
			expect(fixed).toMatchObject(complex)
		})
	})

	describe('types', () => {
		const types = {
			map: {
				input: new Map([
					[1, 'a'],
					[2, 'b'],
					[3, 'c'],
				]),
				output: '{"$map":[[1,"a"],[2,"b"],[3,"c"]]}',
			},
			set: {
				input: new Set([1, 2, 3]),
				output: '{"$set":[1,2,3]}',
			},
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
			undefined: {
				input: undefined,
				output: '{"$undefined":0}',
			},
			null: {
				input: null,
				output: 'null',
			},
		}

		for (const [type, entry] of Object.entries(types)) {
			it(type, () => {
				const json = stringify(entry.input)
				expect(json).toBe(entry.output)

				const result = parse(json)
				expect(result).toMatchObject<any>(entry.input)
			})
		}
	})

	describe('extendable', () => {
		class Custom {
			readonly value

			constructor(value: string) {
				this.value = value
			}
		}

		const $custom: Serializable<Custom, string> = {
			is: v => v instanceof Custom,
			parse: v => new Custom(v),
			stringify: v => v.value,
		}

		const value = new Custom('HELLO')

		it('stringify', () => {
			const result = stringify(value, { $custom })
			expect(result).toBe('{"$custom":"HELLO"}')
		})

		it('parse', () => {
			const json = stringify(value, { $custom })
			const result = parse(json, { $custom })
			expect(result).toStrictEqual(value)
		})
	})

	describe('known issues', () => {
		it('stripping undefined object properties', () => {
			const value = { key: undefined }
			const result = parse(stringify(value))

			// sad times :(
			expect(result).toStrictEqual({})
			expect(result).not.toStrictEqual(value)
		})
	})
})
