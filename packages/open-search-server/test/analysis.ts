import { buildAnalysis } from '../src/engine/analysis'
import { OpenSearchError } from '../src/errors'

describe('analysis', () => {
	const registry = buildAnalysis(undefined)

	it('standard analyzer lowercases and keeps apostrophes', () => {
		expect(registry.analyzer('standard')("Don't Stop, the Quick-Brown fox_2!")).toEqual([
			"don't",
			'stop',
			'the',
			'quick',
			'brown',
			'fox_2',
		])
	})

	it('simple, whitespace and keyword analyzers', () => {
		expect(registry.analyzer('simple')('Hello World2 x')).toEqual(['hello', 'world', 'x'])
		expect(registry.analyzer('whitespace')('Hello  World2 x')).toEqual(['Hello', 'World2', 'x'])
		expect(registry.analyzer('keyword')('Hello World')).toEqual(['Hello World'])
	})

	it('english analyzer removes stop words and stems', () => {
		expect(registry.analyzer('english')('The foxes are running quickly')).toEqual(['fox', 'run', 'quickli'])
		expect(registry.analyzer('english')("the dog's bones")).toEqual(['dog', 'bone'])
	})

	it('custom analyzers and normalizers from settings', () => {
		const custom = buildAnalysis({
			analyzer: {
				edge: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding', 'edge'] },
				plain: { tokenizer: 'whitespace', filter: ['uppercase'] },
			},
			filter: { edge: { type: 'edge_ngram', min_gram: 2, max_gram: 3 } },
			normalizer: { lower: { type: 'custom', filter: ['lowercase', 'asciifolding'] } },
		})
		expect(custom.analyzer('edge')('Élan')).toEqual(['el', 'ela'])
		expect(custom.analyzer('plain')('a b')).toEqual(['A', 'B'])
		expect(custom.normalizer('lower')('Élan')).toBe('elan')
	})

	it('rejects unsupported analysis components', () => {
		expect(() => buildAnalysis({ analyzer: { x: { type: 'custom', tokenizer: 'icu_tokenizer' } } })).toThrow(
			OpenSearchError
		)
		expect(() =>
			buildAnalysis({ analyzer: { x: { type: 'custom', tokenizer: 'standard', filter: ['synonym'] } } })
		).toThrow(/synonym/)
		expect(() => buildAnalysis({ analyzer: { x: { type: 'french' } } })).toThrow(/french/)
		expect(() => registry.analyzer('nope')).toThrow(OpenSearchError)
	})
})
