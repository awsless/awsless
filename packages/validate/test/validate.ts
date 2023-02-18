
import { describe, it, expect } from 'vitest'
import { bigfloat, date, uuid, positive, precision, lowercase, uppercase, string, StructError, create, json, object, array, unique, number } from '../src/index'
import { BigFloat } from '@heat/big-float'

describe('Validate Types', () => {

	type TestRuleOptions = {
		valid?: any[]
		invalid?: any[]
		validate: (value: any) => void
	}

	const testRule = (type:string, { valid, invalid, validate }:TestRuleOptions) => {
		describe(type, () => {
			if(valid) {
				it(`valid`, () => {
					valid.forEach((value) => {
						validate(value)
					})
				})
			}

			if(invalid) {
				it(`invalid`, () => {
					invalid.forEach((value) => {
						expect(() => validate(value)).toThrow(StructError)
					})
				})
			}
		})
	}

	testRule('big float', {
		valid: [0, -1, 1, '0', '1', '-1', new BigFloat(1), new BigFloat('1')],
		invalid: [null, undefined, true, false, NaN, '', 'a', [], {}, new Date(), new Set(), new Map()],
		validate: (value) => {
			const result = create(value, bigfloat())
			expect(result.toString()).toBe(value.toString())
		}
	})

	testRule('big float positive', {
		valid: [1, 100, 1000],
		invalid: [0, -1, -100, -1000],
		validate: (value) => {
			const result = create(value, positive(bigfloat()))
			expect(result.toString()).toBe(value.toString())
		}
	})

	testRule('big float precision', {
		valid: [0, 1, 100, 1000, 0.01, 100.01],
		invalid: [0.001, 100.0001],
		validate: (value) => {
			const result = create(value, precision(bigfloat(), 2))
			expect(result.toString()).toBe(value.toString())
		}
	})

	testRule('date', {
		valid: [ '1-1-2000', '01-01-2000', new Date() ],
		invalid: [null, undefined, true, false, NaN, '', 'a', 'today', [], {}, new Set(), new Map()],
		validate: (value) => {
			const result = create(value, date())
			expect(result).toBeInstanceOf(Date)
		}
	})

	testRule('uuid', {
		valid: [
			'857b3f0a-a777-11e5-bf7f-feff819cdc9f', // v1
			'9a7b330a-a736-21e5-af7f-feaf819cdc9f', // v2
			'0a7b330a-a736-35ea-8f7f-feaf019cdc00', // v3
			'c51c80c2-66a1-442a-91e2-4f55b4256a72', // v4
			'5a2de30a-a736-5aea-8f7f-ad0f019cdc00', // v5
		],
		invalid: [
			null, undefined, true, false, NaN, '', 'a', [], {}, new Date(), new Set(), new Map(),
			'00000000-0000-0000-0000-000000000000',
		],
		validate: (value) => {
			const result = create(value, uuid())
			expect(result).toBe(value)
		}
	})

	testRule('lowercase', {
		valid: [ 'heLLo', 'WORld', '123' ],
		validate: (value) => {
			const result = create(value, lowercase(string()))
			expect(result).toBe(value.toLowerCase())
		}
	})

	testRule('uppercase', {
		valid: [ 'heLLo', 'WORld', '123' ],
		validate: (value) => {
			const result = create(value, uppercase(string()))
			expect(result).toBe(value.toUpperCase())
		}
	})

	testRule('unique', {
		valid: [
			[],
			[ 1, 2, 3 ],
			[ 'a', 'b', 'c' ],
			[ '1', 1 ],
			[ true, false ],
			[ {}, {} ], // different objects.
			[ [], [] ], // different arrays.
		],
		invalid: [
			[ 1, 1 ],
			[ '1', '1' ],
			[ null, null ],
			[ undefined, undefined ],
			[ true, true ],
			[ false, false ],
		],
		validate: (value) => {
			const result = create(value, unique(array()))
			expect(result).toStrictEqual(value)
		}
	})

	testRule('unique', {
		valid: [
			[ { key: 1 }, { key: 2 } ],
		],
		invalid: [
			[ { key: 1 }, { key: 1 } ],
		],
		validate: (value) => {
			const result = create(value, unique(
				array(object({ key: number() })),
				(a, b) => a.key === b.key
			))
			expect(result).toStrictEqual(value)
		}
	})

	testRule('json', {
		valid: [ '{"foo":"bar"}' ],
		invalid: [ undefined, null, '', '{}' ],
		validate: (value) => {
			const result = create(value, json(object({
				foo: string()
			})))

			expect(result).toStrictEqual({
				foo: 'bar'
			})
		}
	})
})
