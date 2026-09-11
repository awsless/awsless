import { compileScript, ScriptScope } from '../src/engine/painless'
import { OpenSearchError } from '../src/errors'

const fields: Record<string, Array<number | string | boolean>> = {
	blockedCountries: ['PL', 'DE'],
	popularity: [42],
	name: ['Book of Ra'],
	tags: [],
}

const scope = (params: Record<string, unknown> = {}): ScriptScope => ({
	field: name => {
		const values = fields[name]
		if (!values)
			throw new OpenSearchError('illegal_argument_exception', 400, `No field found for [${name}] in mapping`)
		return values
	},
	params,
})

const run = (source: string, params?: Record<string, unknown>) => compileScript(source)(scope(params))

describe('painless subset', () => {
	it('evaluates the blocked countries sort script', () => {
		const source = "return doc['blockedCountries'].contains(params.country) ? 1 : 0"
		expect(run(source, { country: 'PL' })).toBe(1)
		expect(run(source, { country: 'NL' })).toBe(0)
		expect(run(source, {})).toBe(0)
	})

	it('reads values, sizes and params', () => {
		expect(run("doc['popularity'].value")).toBe(42)
		expect(run("doc['popularity'].value * 2 + 1")).toBe(85)
		expect(run("doc['blockedCountries'].size()")).toBe(2)
		expect(run("doc['blockedCountries'].length")).toBe(2)
		expect(run("doc['tags'].empty")).toBe(true)
		expect(run("doc['tags'].value")).toBeNull()
		expect(run("doc['blockedCountries'].values[1]")).toBe('DE')
		expect(run("params['boost'] * doc['popularity'].value", { boost: 0.5 })).toBe(21)
		expect(run('params.missing')).toBeNull()
	})

	it('handles precedence, logic, comparisons and strings', () => {
		expect(run('1 + 2 * 3')).toBe(7)
		expect(run('(1 + 2) * 3')).toBe(9)
		expect(run('10 % 4 - -1')).toBe(3)
		expect(run("doc['popularity'].value > 40 && !doc['tags'].empty ? 'a' : 'b'")).toBe('b')
		expect(run("doc['popularity'].value >= 42 || false")).toBe(true)
		expect(run("doc['name'].value.toLowerCase().startsWith('book')")).toBe(true)
		expect(run("doc['name'].value + '!'")).toBe('Book of Ra!')
		expect(run("Math.max(doc['popularity'].value, 100)")).toBe(100)
		expect(run("doc['name'].value == 'Book of Ra' ? 1 : 0;")).toBe(1)
	})

	it('fails loud on anything outside the subset', () => {
		expect(() => run('int x = 1; return x')).toThrow(OpenSearchError)
		expect(() => run("doc['name'].value.substring(1)")).toThrow(/substring/)
		expect(() => run('foo.bar')).toThrow(/"foo" identifier/)
		expect(() => run("doc['nope'].value")).toThrow(/No field found for \[nope\]/)
		expect(() => run("doc['popularity'].value ? 1 : 0")).toThrow(/boolean/)
		expect(() => run('1 << 2')).toThrow(/"<<" operator/)
	})
})
