import { BigFloat, mul } from '@awsless/big-float'
import { parse, patch, Serializable, stringify, unpatch } from '../src'
import { days } from '@awsless/duration'

describe('JSON', () => {
	describe('basic', () => {
		it('stringify', () => {
			const result = stringify(1n)
			expect(result).toBeTypeOf('string')
		})

		it('parse', () => {
			const result = parse(stringify(1n))
			expect(result).toBe(1n)
		})

		it('patch', () => {
			const result = patch({ $bigint: '1' })
			expect(result).toBe(1n)
		})

		it('unpatch', () => {
			const result = unpatch(1n)
			expect(result).toStrictEqual({
				$bigint: '1',
			})
		})
	})

	describe('complex', () => {
		const complex = {
			// -----------------------------
			// standard supported JSON types

			string: 'hello world',
			number: 1,
			boolean: true,
			array: [1, 2, 3],
			object: { foo: 'bar' },
			null: null,

			// -----------------------------
			// extended types

			map: new Map([
				[1n, 'a'],
				[2n, 'b'],
				[3n, 'c'],
			]),
			set: new Set([1n, 2n, 3n]),
			date: new Date('2025-01-01'),
			bigint: BigInt(Number.MAX_SAFE_INTEGER) * 9999n,
			bigfloat: mul(Number.MAX_SAFE_INTEGER, 9999.9999),
			regexp: /[0-9]/m,
			infinity: Infinity,
			negInfinity: -Infinity,
			nan: NaN,
			undefined: undefined,
			url: new URL('https://domain.com/path?query#hash'),
			binary: new Uint8Array([1]),
			duration: days(1),

			undefinedSet: new Set([undefined]),
			undefinedMap: new Map([[undefined, undefined]]),
			undefinedArray: [undefined],

			nullSet: new Set([null]),
			nullMap: new Map([[null, null]]),
			nullArray: [null],
		}

		it('stringify', () => {
			const result = stringify(complex)
			expect(result).toBeTypeOf('string')
		})

		it('parse', () => {
			const result = parse(stringify(complex))
			expect(result).toStrictEqual(complex)
		})

		it('patch', () => {
			const broken = JSON.parse(stringify(complex))
			expect(broken).not.toMatchObject(complex)

			const fixed = patch(broken)
			expect(fixed).toStrictEqual(complex)
		})

		it('unpatch', () => {
			const broken = JSON.parse(stringify(complex))
			const result = unpatch(complex)
			expect(result).toMatchObject(broken)
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
			regexp: {
				input: /[0-9]/m,
				output: '{"$regexp":["[0-9]","m"]}',
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
			nan: {
				input: NaN,
				output: '{"$nan":0}',
			},
			infinity: {
				input: Infinity,
				output: '{"$infinity":1}',
			},
			'negative-infinity': {
				input: -Infinity,
				output: '{"$infinity":0}',
			},
			url: {
				input: new URL('https://domain.com/path?query#hash'),
				output: '{"$url":"https://domain.com/path?query#hash"}',
			},
			binary: {
				input: new Uint8Array([1, 2, 3, 4, 5]),
				output: '{"$binary":"AQIDBAU="}',
			},
			duration: {
				input: days(1),
				output: '{"$duration":"86400000"}',
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

	// describe('consistancy', () => {})

	describe('known issues', () => {
		it(`don't use the $ character inside your JSON`, () => {
			const value = { $bigint: 'This will break' }
			const json = stringify(value)

			expect(() => {
				parse(json)
			}).toThrow(SyntaxError)
		})

		// it('stripping undefined from object properties', () => {
		// 	const input = { key: undefined }
		// 	const result = parse(stringify(input))

		// 	expect(result).toStrictEqual({})
		// 	expect(result).not.toStrictEqual(input)
		// })

		// it('stripping undefined from array values', () => {
		// 	const input = [undefined]
		// 	const result = parse(stringify(input))

		// 	expect(result).toStrictEqual(new Array(1))
		// 	expect(result).not.toStrictEqual(input)
		// })
	})
})

// function parseWithFixup(input) {
//   const fixups = [];
//   function reviver(key, val) {
//     if (val === "$undefined") {
//       // we'll replace this value with an undefined at the end.
//       fixups.push([this, key]);

//       if (key === "") {
//         // we might be at the top-level, i.e. visiting the root.
//         // in case the whole string is "$undefined", we return undefined here --
//         // we won't get the chance to replace it after.
//         return undefined;
//       }

//       return null; // we'll replace it later, but just in case... it's close enough
//     }

//     return val;
//   };

//   const res = JSON.parse(input, reviver);

//   for (let i = 0, len = fixups.length; i < len; i++) {
//     const fixup = fixups[i];
//     const target = fixup[0], key = fixup[1];
//     target[key] = undefined;
//   }

//   return res;
// }
