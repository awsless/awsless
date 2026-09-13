import { OpenSearchError } from '../src/errors'
import { ids, makeStore, run } from './_helpers'

const mappings = {
	properties: {
		title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
		body: { type: 'text', analyzer: 'english' },
		tag: { type: 'keyword' },
		tags: { type: 'keyword' },
		price: { type: 'double' },
		count: { type: 'long' },
		active: { type: 'boolean' },
		created: { type: 'date' },
		ip: { type: 'ip' },
		meta: { properties: { level: { type: 'integer' }, label: { type: 'keyword' } } },
		items: { type: 'nested', properties: { name: { type: 'keyword' }, qty: { type: 'integer' } } },
	},
}

const docs: Array<[string, Record<string, unknown>]> = [
	[
		'1',
		{
			title: 'The Quick Brown Fox',
			body: 'foxes are running quickly',
			tag: 'animal',
			tags: ['a', 'b'],
			price: 10.5,
			count: 1,
			active: true,
			created: '2024-01-10T00:00:00Z',
			ip: '10.0.0.1',
			meta: { level: 1, label: 'x' },
			items: [
				{ name: 'apple', qty: 1 },
				{ name: 'pear', qty: 5 },
			],
		},
	],
	[
		'2',
		{
			title: 'Lazy Dog',
			body: 'the dog sleeps',
			tag: 'animal',
			tags: ['b', 'c'],
			price: 20,
			count: '2',
			active: 'false',
			created: 1705881600000,
			meta: { level: 2, label: 'y' },
			items: [{ name: 'apple', qty: 5 }],
		},
	],
	[
		'3',
		{
			title: 'Brown Bear Brown',
			tag: 'wild',
			price: 5,
			count: 3,
			active: true,
			created: '2024-03-01',
		},
	],
]

describe('query engine', () => {
	const { store } = makeStore('test', mappings, docs)

	it('match_all and match_none', () => {
		expect(ids(run(store, { query: { match_all: {} } }))).toEqual(['1', '2', '3'])
		expect(ids(run(store, { query: { match_none: {} } }))).toEqual([])
		expect(ids(run(store, {}))).toHaveLength(3)
	})

	it('ids and exists', () => {
		expect(ids(run(store, { query: { ids: { values: ['3', '1'] } } }))).toEqual(['1', '3'])
		expect(ids(run(store, { query: { exists: { field: 'body' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { exists: { field: 'meta' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { exists: { field: 'nope' } } }))).toEqual([])
	})

	it('term on keyword, text tokens, numbers, booleans, dates', () => {
		expect(ids(run(store, { query: { term: { tag: 'animal' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { term: { 'title.keyword': 'Lazy Dog' } } }))).toEqual(['2'])
		expect(ids(run(store, { query: { term: { title: 'brown' } } })).toSorted()).toEqual(['1', '3'])
		expect(ids(run(store, { query: { term: { title: 'Brown' } } }))).toEqual([])
		expect(
			ids(run(store, { query: { term: { title: { value: 'BROWN', case_insensitive: true } } } })).toSorted()
		).toEqual(['1', '3'])
		expect(ids(run(store, { query: { term: { count: '2' } } }))).toEqual(['2'])
		expect(ids(run(store, { query: { term: { active: 'true' } } }))).toEqual(['1', '3'])
		expect(ids(run(store, { query: { term: { created: '2024-03-01' } } }))).toEqual(['3'])
		expect(ids(run(store, { query: { term: { ip: '10.0.0.1' } } }))).toEqual(['1'])
	})

	it('terms', () => {
		expect(ids(run(store, { query: { terms: { tags: ['c', 'zzz'] } } }))).toEqual(['2'])
		expect(ids(run(store, { query: { terms: { count: [1, 3] } } }))).toEqual(['1', '3'])
		expect(() => run(store, { query: { terms: { tag: { index: 'x', id: '1', path: 'p' } } } })).toThrow(
			/terms lookup/
		)
	})

	it('range on numbers, dates and date math', () => {
		expect(ids(run(store, { query: { range: { price: { gte: 10, lt: 20 } } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { range: { price: { gt: '10.5' } } } }))).toEqual(['2'])
		expect(ids(run(store, { query: { range: { created: { gte: '2024-01-15', lte: '2024-03-01' } } } }))).toEqual([
			'2',
			'3',
		])
		expect(ids(run(store, { query: { range: { created: { gte: 'now-100y', lte: 'now/d' } } } }))).toEqual([
			'1',
			'2',
			'3',
		])
		expect(ids(run(store, { query: { range: { created: { gte: '2024-01-10||+1d/d' } } } }))).toEqual(['2', '3'])
		expect(
			ids(run(store, { query: { range: { created: { gt: 1705881600000, format: 'epoch_millis' } } } }))
		).toEqual(['3'])
		expect(ids(run(store, { query: { range: { tag: { gte: 'b' } } } }))).toEqual(['3'])
	})

	it('prefix, wildcard, regexp, fuzzy', () => {
		expect(ids(run(store, { query: { prefix: { tag: 'ani' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { prefix: { title: 'bro' } } })).toSorted()).toEqual(['1', '3'])
		expect(ids(run(store, { query: { wildcard: { 'title.keyword': 'Lazy*' } } }))).toEqual(['2'])
		expect(
			ids(run(store, { query: { wildcard: { 'title.keyword': { value: 'lazy d?g', case_insensitive: true } } } }))
		).toEqual(['2'])
		expect(ids(run(store, { query: { regexp: { tag: 'wi.*' } } }))).toEqual(['3'])
		expect(ids(run(store, { query: { fuzzy: { tag: 'animel' } } }))).toEqual(['1', '2'])
		expect(
			ids(run(store, { query: { fuzzy: { tag: { value: 'xnimal', fuzziness: 1, prefix_length: 1 } } } }))
		).toEqual([])
		expect(
			ids(run(store, { query: { fuzzy: { title: { value: 'borwn', transpositions: true } } } })).toSorted()
		).toEqual(['1', '3'])
		expect(() => run(store, { query: { prefix: { price: '1' } } })).toThrow(OpenSearchError)
	})

	it('match with operators, fuzziness and minimum_should_match', () => {
		expect(ids(run(store, { query: { match: { title: 'brown fox' } } })).toSorted()).toEqual(['1', '3'])
		expect(ids(run(store, { query: { match: { title: { query: 'brown fox', operator: 'and' } } } }))).toEqual(['1'])
		expect(
			ids(run(store, { query: { match: { title: { query: 'brwn fox', fuzziness: 'AUTO', operator: 'and' } } } }))
		).toEqual(['1'])
		expect(
			ids(run(store, { query: { match: { title: { query: 'brown quick lazy', minimum_should_match: 2 } } } }))
		).toEqual(['1'])
		expect(
			ids(run(store, { query: { match: { title: { query: 'brown quick lazy', minimum_should_match: '-1' } } } }))
		).toEqual(['1'])
		expect(
			ids(run(store, { query: { match: { title: { query: 'brown quick lazy', minimum_should_match: '70%' } } } }))
		).toEqual(['1'])
		expect(ids(run(store, { query: { match: { body: 'run' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { match: { body: 'the' } } }))).toEqual([])
		expect(ids(run(store, { query: { match: { body: { query: 'the', zero_terms_query: 'all' } } } }))).toEqual([
			'1',
			'2',
			'3',
		])
		expect(ids(run(store, { query: { match: { tag: 'animal' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { match: { count: '3' } } }))).toEqual(['3'])
		expect(() => run(store, { query: { match: { count: 'abc' } } })).toThrow(OpenSearchError)
		expect(ids(run(store, { query: { match: { count: { query: 'abc', lenient: true } } } }))).toEqual([])
	})

	it('match scores with BM25 ordering', () => {
		const result = run(store, { query: { match: { title: 'brown' } } })
		expect(ids(result)).toEqual(['3', '1'])
		const hits = (result.hits as { hits: Array<{ _score: number }> }).hits
		expect(hits[0]!._score).toBeGreaterThan(hits[1]!._score)
	})

	it('match_phrase and match_phrase_prefix', () => {
		expect(ids(run(store, { query: { match_phrase: { title: 'quick brown' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { match_phrase: { title: 'brown quick' } } }))).toEqual([])
		expect(ids(run(store, { query: { match_phrase: { title: { query: 'brown quick', slop: 2 } } } }))).toEqual([
			'1',
		])
		expect(ids(run(store, { query: { match_phrase: { title: { query: 'quick fox', slop: 1 } } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { match_phrase_prefix: { title: 'quick br' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { match_phrase: { 'title.keyword': 'Lazy Dog' } } }))).toEqual(['2'])
	})

	it('match_bool_prefix', () => {
		expect(ids(run(store, { query: { match_bool_prefix: { title: 'quick br' } } })).toSorted()).toEqual(['1', '3'])
		expect(
			ids(run(store, { query: { match_bool_prefix: { title: { query: 'quick br', operator: 'and' } } } }))
		).toEqual(['1'])
		expect(
			ids(run(store, { query: { match_bool_prefix: { title: { query: 'quick lazy', operator: 'and' } } } }))
		).toEqual([])
		expect(ids(run(store, { query: { match_bool_prefix: { 'title.keyword': 'The Qu' } } }))).toEqual(['1'])
		expect(() => run(store, { query: { match_bool_prefix: { count: '1' } } })).toThrow(OpenSearchError)
	})

	it('never matches everything when minimum_should_match rounds down to zero', () => {
		// One fuzzy term with a percentage: 65% of 1 clause is 0, yet only a
		// real match may score.
		const typo = {
			multi_match: {
				query: 'quik',
				type: 'most_fields',
				fuzziness: 'AUTO',
				minimum_should_match: '65%',
				fields: ['title^4', 'body'],
			},
		}
		expect(ids(run(store, { query: typo }))).toEqual(['1'])
		expect(ids(run(store, { query: { bool: { must: [typo] } }, sort: [{ count: 'desc' }] }))).toEqual(['1'])
		expect(
			ids(run(store, { query: { match: { title: { query: 'nothinghere', minimum_should_match: '0%' } } } }))
		).toEqual([])
		expect(
			ids(run(store, { query: { bool: { should: [{ term: { tag: 'nope' } }], minimum_should_match: 0 } } }))
		).toEqual([])
	})

	it('multi_match', () => {
		expect(ids(run(store, { query: { multi_match: { query: 'dog', fields: ['title', 'body'] } } }))).toEqual(['2'])
		expect(
			ids(run(store, { query: { multi_match: { query: 'brown', fields: ['tit*^2', 'body'] } } })).toSorted()
		).toEqual(['1', '3'])
		expect(
			ids(
				run(store, {
					query: { multi_match: { query: 'quick brown', fields: ['title', 'body'], type: 'phrase' } },
				})
			)
		).toEqual(['1'])
		expect(
			ids(
				run(store, { query: { multi_match: { query: 'fox', fields: ['title', 'body'], type: 'most_fields' } } })
			)
		).toEqual(['1'])
		expect(ids(run(store, { query: { multi_match: { query: 'animal' } } }))).toEqual(['1', '2'])
		expect(() =>
			run(store, { query: { multi_match: { query: 'x', fields: ['title'], type: 'cross_fields' } } })
		).toThrow(/cross_fields/)
	})

	it('bool with must, filter, should, must_not', () => {
		expect(
			ids(
				run(store, { query: { bool: { must: { term: { tag: 'animal' } }, must_not: { term: { count: 2 } } } } })
			)
		).toEqual(['1'])
		expect(ids(run(store, { query: { bool: { filter: [{ range: { price: { gte: 10 } } }] } } }))).toEqual([
			'1',
			'2',
		])
		expect(
			ids(run(store, { query: { bool: { should: [{ term: { tag: 'wild' } }, { term: { count: 2 } }] } } }))
		).toEqual(['2', '3'])
		expect(
			ids(run(store, { query: { bool: { must: { match_all: {} }, should: [{ term: { tag: 'wild' } }] } } }))
		).toEqual(['3', '1', '2'])
		expect(
			ids(
				run(store, {
					query: {
						bool: {
							should: [{ term: { tag: 'animal' } }, { term: { count: 2 } }],
							minimum_should_match: 2,
						},
					},
				})
			)
		).toEqual(['2'])
		expect(ids(run(store, { query: { bool: {} } }))).toHaveLength(3)

		const filtered = run(store, { query: { bool: { filter: { term: { tag: 'wild' } } } } })
		expect((filtered.hits as { hits: Array<{ _score: number }> }).hits[0]!._score).toBe(0)
	})

	it('constant_score and dis_max', () => {
		const result = run(store, { query: { constant_score: { filter: { term: { tag: 'wild' } }, boost: 3 } } })
		expect((result.hits as { hits: Array<{ _score: number }> }).hits[0]!._score).toBe(3)
		expect(
			ids(run(store, { query: { dis_max: { queries: [{ term: { tag: 'wild' } }, { term: { count: 1 } }] } } }))
		).toEqual(['1', '3'])
	})

	it('nested', () => {
		const query = {
			nested: {
				path: 'items',
				query: {
					bool: { must: [{ term: { 'items.name': 'apple' } }, { range: { 'items.qty': { gte: 5 } } }] },
				},
			},
		}
		expect(ids(run(store, { query }))).toEqual(['2'])
		expect(ids(run(store, { query: { term: { 'items.name': 'apple' } } }))).toEqual([])
		expect(() => run(store, { query: { nested: { path: 'meta', query: { match_all: {} } } } })).toThrow(
			/nested object under path/
		)
	})

	it('object fields flatten', () => {
		expect(ids(run(store, { query: { term: { 'meta.label': 'y' } } }))).toEqual(['2'])
		expect(ids(run(store, { query: { range: { 'meta.level': { lte: 1 } } } }))).toEqual(['1'])
	})

	it('query_string', () => {
		expect(ids(run(store, { query: { query_string: { query: 'brown', fields: ['title'] } } })).toSorted()).toEqual([
			'1',
			'3',
		])
		expect(ids(run(store, { query: { query_string: { query: 'tag:wild OR count:2' } } }))).toEqual(['2', '3'])
		expect(
			ids(run(store, { query: { query_string: { query: 'brown AND fox', default_field: 'title' } } }))
		).toEqual(['1'])
		expect(ids(run(store, { query: { query_string: { query: 'brown -fox', default_field: 'title' } } }))).toEqual([
			'3',
		])
		expect(ids(run(store, { query: { query_string: { query: 'brown +fox', default_field: 'title' } } }))).toEqual([
			'1',
		])
		expect(ids(run(store, { query: { query_string: { query: 'NOT tag:animal' } } }))).toEqual(['3'])
		expect(ids(run(store, { query: { query_string: { query: '"quick brown"', fields: ['title'] } } }))).toEqual([
			'1',
		])
		expect(ids(run(store, { query: { query_string: { query: 'title:(lazy OR bear)' } } }))).toEqual(['2', '3'])
		expect(ids(run(store, { query: { query_string: { query: 'price:[10 TO 20]' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { query_string: { query: 'price:{10 TO 20]' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { query_string: { query: 'price:>10' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { query_string: { query: 'count:<=1' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { query_string: { query: 'created:[2024-02-01 TO *]' } } }))).toEqual(['3'])
		expect(ids(run(store, { query: { query_string: { query: 'bro*', fields: ['title'] } } })).toSorted()).toEqual([
			'1',
			'3',
		])
		expect(ids(run(store, { query: { query_string: { query: '*own', fields: ['title'] } } })).toSorted()).toEqual([
			'1',
			'3',
		])
		expect(ids(run(store, { query: { query_string: { query: 'title.keyword:Lazy\\ Dog' } } }))).toEqual(['2'])
		expect(
			ids(
				run(store, { query: { query_string: { query: 'brwn~', fields: ['title'], fuzziness: 'AUTO' } } })
			).toSorted()
		).toEqual(['1', '3'])
		expect(ids(run(store, { query: { query_string: { query: 'brwn~1', fields: ['title'] } } })).toSorted()).toEqual(
			['1', '3']
		)
		expect(
			ids(
				run(store, {
					query: { query_string: { query: 'quick fox', fields: ['title'], default_operator: 'AND' } },
				})
			)
		).toEqual(['1'])
		expect(ids(run(store, { query: { query_string: { query: '_exists_:body' } } }))).toEqual(['1', '2'])
		expect(ids(run(store, { query: { query_string: { query: '*:*' } } }))).toHaveLength(3)
		expect(ids(run(store, { query: { query_string: { query: 'dog', fields: ['title^3', 'body'] } } }))).toEqual([
			'2',
		])
		expect(() =>
			run(store, { query: { query_string: { query: '*own', fields: ['title'], allow_leading_wildcard: false } } })
		).toThrow(OpenSearchError)
		expect(() => run(store, { query: { query_string: { query: 'title:(brown' } } })).toThrow(
			/Failed to parse query/
		)
	})

	it('simple_query_string', () => {
		expect(
			ids(run(store, { query: { simple_query_string: { query: 'brown fox', fields: ['title'] } } })).toSorted()
		).toEqual(['1', '3'])
		expect(
			ids(run(store, { query: { simple_query_string: { query: 'brown + fox', fields: ['title'] } } }))
		).toEqual(['1'])
		expect(ids(run(store, { query: { simple_query_string: { query: 'brown -fox', fields: ['title'] } } }))).toEqual(
			['3']
		)
		expect(
			ids(run(store, { query: { simple_query_string: { query: '"quick brown"', fields: ['title'] } } }))
		).toEqual(['1'])
		expect(
			ids(run(store, { query: { simple_query_string: { query: 'lazy | bear', fields: ['title'] } } }))
		).toEqual(['2', '3'])
		expect(
			ids(run(store, { query: { simple_query_string: { query: 'bro*', fields: ['title'] } } })).toSorted()
		).toEqual(['1', '3'])
		expect(
			ids(run(store, { query: { simple_query_string: { query: 'brwn~1', fields: ['title'] } } })).toSorted()
		).toEqual(['1', '3'])
	})

	it('rejects unsupported clauses loudly', () => {
		for (const clause of ['function_score', 'script_score', 'more_like_this', 'knn', 'span_term', 'geo_distance']) {
			let caught: unknown
			try {
				run(store, { query: { [clause]: {} } })
			} catch (error) {
				caught = error
			}
			expect(caught).toBeInstanceOf(OpenSearchError)
			const error = caught as OpenSearchError
			expect(error.status).toBe(400)
			expect(error.type).toBe('search_phase_execution_exception')
			expect(error.rootCause.type).toBe('illegal_argument_exception')
			expect(error.reason).toContain(`"${clause}" query`)
		}
		expect(() => run(store, { query: { match: { title: { query: 'x', unknown_option: 1 } } } })).toThrow(
			/unknown_option/
		)
		expect(() => run(store, { query: { bogus: {} } })).toThrow(/unknown query \[bogus\]/)
	})

	it('rejects unsupported body keys', () => {
		for (const key of ['highlight', 'suggest', 'collapse', 'script_fields', 'runtime_mappings', 'knn']) {
			expect(() => run(store, { [key]: {} })).toThrow(new RegExp(`"${key}" search body option`))
		}
	})

	it('min_score, _source filtering and track_total_hits', () => {
		expect(ids(run(store, { query: { match: { title: 'brown' } }, min_score: 100 }))).toEqual([])

		const result = run(store, { query: { ids: { values: ['1'] } }, _source: ['title', 'meta.level'] })
		const hits = (result.hits as { hits: Array<{ _source: unknown }> }).hits
		expect(hits[0]!._source).toEqual({ title: 'The Quick Brown Fox', meta: { level: 1 } })

		const excluded = run(store, { query: { ids: { values: ['1'] } }, _source: { excludes: ['items', 'meta.*'] } })
		const source = (excluded.hits as { hits: Array<{ _source: Record<string, unknown> }> }).hits[0]!._source
		expect(source.items).toBeUndefined()
		expect(source.meta).toEqual({})
		expect(source.title).toBe('The Quick Brown Fox')

		const none = run(store, { query: { ids: { values: ['1'] } }, _source: false })
		expect((none.hits as { hits: Array<{ _source?: unknown }> }).hits[0]!._source).toBeUndefined()

		expect((run(store, { track_total_hits: 2 }).hits as { total: unknown }).total).toEqual({
			value: 2,
			relation: 'gte',
		})
		expect((run(store, { track_total_hits: false }).hits as { total: unknown }).total).toBeUndefined()
		expect(run(store, { size: 0 }).hits as { total: unknown; hits: unknown[] }).toMatchObject({
			total: { value: 3, relation: 'eq' },
			hits: [],
		})
	})

	it('supports the q parameter and from/size', () => {
		expect(ids(run(store, {}, 'test', { q: 'tag:wild' }))).toEqual(['3'])
		expect(ids(run(store, {}, 'test', { from: '1', size: '1' }))).toEqual(['2'])
	})

	it('searches across indices and rejects a missing index', () => {
		const { store: multi } = makeStore('a', undefined, [['1', { x: 1 }]])
		multi.create('b', undefined, undefined).put('2', { x: 2 })
		expect(ids(run(multi, {}, 'a,b'))).toEqual(['1', '2'])
		expect(ids(run(multi, {}, '_all'))).toEqual(['1', '2'])
		expect(ids(run(multi, {}, '*'))).toEqual(['1', '2'])
		expect(() => run(multi, {}, 'missing')).toThrow(/no such index \[missing\]/)
	})
})
