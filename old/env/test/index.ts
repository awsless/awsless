import { get, string, integer, float, boolean, array, json, enumeration } from '../src/index'

describe('Env', () => {
	const test = (fn: Function, key: string, result: any) => {
		it(`${fn.name}('${key}')`, () => {
			process.env.KEY = String(key)
			expect(fn('KEY')).toStrictEqual(result)
		})
	}

	it('get()', () => expect(() => get('UNKNOWN')).toThrow(TypeError))
	it('get()', () => expect(get('UNKNOWN', 'default')).toBe('default'))

	test(get, 'test', 'test')
	test(string, 'test', 'test')

	test(integer, '0', 0)
	test(integer, '1', 1)
	test(integer, '1.1', 1)

	test(float, '0', 0)
	test(float, '1', 1)
	test(float, '1.1', 1.1)

	test(boolean, 'true', true)
	test(boolean, 'yes', true)
	test(boolean, '1', true)

	test(boolean, 'false', false)
	test(boolean, 'no', false)
	test(boolean, '0', false)

	test(array, '1', ['1'])
	test(array, '1,2', ['1', '2'])
	test(array, '1,2, 3', ['1', '2', '3'])

	test(json, '1', 1)
	test(json, '"test"', 'test')
	test(json, 'true', true)
	test(json, 'false', false)
	test(json, '[]', [])
	test(json, '{}', {})

	it('enumeration()', () => {
		process.env.KEY = 'one'
		expect(enumeration('KEY', ['one', 'two'])).toBe('one')
		expect(() => enumeration('KEY', ['two'])).toThrow(TypeError)
	})
})
