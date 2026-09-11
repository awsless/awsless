import { OpenSearchError } from '../src/errors'
import { ids, makeStore, run } from './_helpers'

type Hits = { hits: Array<{ _id: string; _score: number | null; sort?: unknown[] }>; max_score: number | null }

const mappings = {
	properties: {
		name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
		rank: { type: 'integer' },
		prices: { type: 'double' },
		when: { type: 'date' },
	},
}

const docs: Array<[string, Record<string, unknown>]> = [
	['1', { name: 'charlie', rank: 3, prices: [5, 50], when: '2024-01-03' }],
	['2', { name: 'alpha', rank: 1, prices: [20], when: '2024-01-01' }],
	['3', { name: 'bravo', rank: 2, when: '2024-01-02' }],
	['4', { name: 'delta', prices: [1, 100], when: '2024-01-04' }],
]

describe('script sorting', () => {
	const { store } = makeStore(
		'games',
		{
			properties: {
				name: { type: 'keyword' },
				popularity: { type: 'integer' },
				blockedCountries: { type: 'keyword' },
			},
		},
		[
			['a', { name: 'a', popularity: 3, blockedCountries: ['PL'] }],
			['b', { name: 'b', popularity: 2, blockedCountries: [] }],
			['c', { name: 'c', popularity: 1, blockedCountries: ['PL', 'DE'] }],
		]
	)

	const blocked = (country: string) => ({
		_script: {
			type: 'number',
			order: 'asc',
			script: {
				inline: "return doc['blockedCountries'].contains(params.country) ? 1 : 0",
				params: { country },
			},
		},
	})

	it('sorts blocked games last, then by the next key', () => {
		const response = run(store, { sort: [blocked('PL'), { popularity: 'desc' }] }, 'games')
		expect(ids(response)).toEqual(['b', 'a', 'c'])
		expect((response.hits as Hits).hits.map(hit => hit.sort)).toEqual([
			[0, 2],
			[1, 3],
			[1, 1],
		])
		expect(ids(run(store, { sort: [blocked('NL'), { popularity: 'desc' }] }, 'games'))).toEqual(['a', 'b', 'c'])
	})

	it('supports string results and search_after', () => {
		const sort = [{ _script: { type: 'string', order: 'desc', script: { source: "doc['name'].value + '-x'" } } }]
		const first = run(store, { sort, size: 2 }, 'games')
		expect(ids(first)).toEqual(['c', 'b'])
		const last = (first.hits as Hits).hits[1]!.sort
		expect(last).toEqual(['b-x'])
		expect(ids(run(store, { sort, size: 2, search_after: last }, 'games'))).toEqual(['a'])
	})

	it('rejects what the subset does not cover', () => {
		expect(() =>
			run(store, { sort: [{ _script: { type: 'number', script: { source: 'int x = 1; return x' } } }] }, 'games')
		).toThrow(OpenSearchError)
		expect(() =>
			run(
				store,
				{ sort: [{ _script: { type: 'number', script: { source: '1', lang: 'expression' } } }] },
				'games'
			)
		).toThrow(/expression/)
		expect(() => run(store, { sort: [{ _script: { script: { source: '1' } } }] }, 'games')).toThrow(/type/)
	})
})

describe('sorting', () => {
	const { store } = makeStore('test', mappings, docs)

	it('sorts by keyword, numbers and dates in either direction', () => {
		expect(ids(run(store, { sort: 'name.keyword' }))).toEqual(['2', '3', '1', '4'])
		expect(ids(run(store, { sort: { 'name.keyword': 'desc' } }))).toEqual(['4', '1', '3', '2'])
		expect(ids(run(store, { sort: [{ rank: { order: 'asc' } }] }))).toEqual(['2', '3', '1', '4'])
		expect(ids(run(store, { sort: [{ rank: { order: 'desc' } }] }))).toEqual(['1', '3', '2', '4'])
		expect(ids(run(store, { sort: [{ when: 'desc' }] }))).toEqual(['4', '1', '3', '2'])
	})

	it('handles missing values and modes', () => {
		expect(ids(run(store, { sort: [{ rank: { order: 'asc', missing: '_first' } }] }))).toEqual(['4', '2', '3', '1'])
		expect(ids(run(store, { sort: [{ rank: { order: 'asc', missing: 0 } }] }))).toEqual(['4', '2', '3', '1'])
		expect(ids(run(store, { sort: [{ prices: 'asc' }] }))).toEqual(['4', '1', '2', '3'])
		expect(ids(run(store, { sort: [{ prices: 'desc' }] }))).toEqual(['4', '1', '2', '3'])
		expect(ids(run(store, { sort: [{ prices: { order: 'desc', mode: 'min' } }] }))).toEqual(['2', '1', '4', '3'])
		expect(ids(run(store, { sort: [{ prices: { order: 'asc', mode: 'avg' } }] }))).toEqual(['2', '1', '4', '3'])
		expect(
			ids(run(store, { sort: [{ unmapped: { order: 'asc', unmapped_type: 'long' } }, { rank: 'asc' }] }))
		).toEqual(['2', '3', '1', '4'])
	})

	it('emits sort values and null scores', () => {
		const result = run(store, { sort: [{ rank: 'asc' }, { 'name.keyword': 'asc' }] })
		const hits = (result.hits as Hits).hits
		expect(hits[0]).toMatchObject({ _id: '2', _score: null, sort: [1, 'alpha'] })
		expect(hits[3]!.sort).toEqual([2 ** 63, 'delta'])
		expect((result.hits as Hits).max_score).toBeNull()

		const dated = run(store, { sort: [{ when: 'asc' }] })
		expect((dated.hits as Hits).hits[0]!.sort).toEqual([Date.UTC(2024, 0, 1)])

		const scored = run(store, { query: { match: { name: 'alpha' } }, sort: ['_score', { rank: 'asc' }] })
		expect((scored.hits as Hits).hits[0]!._score).toBeGreaterThan(0)
		expect((scored.hits as Hits).hits[0]!.sort![0]).toBeGreaterThan(0)

		const tracked = run(store, { query: { match: { name: 'alpha' } }, sort: [{ rank: 'asc' }], track_scores: true })
		expect((tracked.hits as Hits).hits[0]!._score).toBeGreaterThan(0)
	})

	it('pages with search_after using the emitted sort values', () => {
		const sort = [{ rank: { order: 'asc' } }, { 'name.keyword': 'asc' }]
		const page1 = run(store, { sort, size: 2 })
		const last = (page1.hits as Hits).hits[1]!.sort
		const page2 = run(store, { sort, size: 2, search_after: last })
		expect(ids(page1)).toEqual(['2', '3'])
		expect(ids(page2)).toEqual(['1', '4'])
		const page3 = run(store, { sort, size: 2, search_after: (page2.hits as Hits).hits[1]!.sort })
		expect(ids(page3)).toEqual([])

		const desc = [{ rank: 'desc' }, { 'name.keyword': 'desc' }]
		const first = run(store, { sort: desc, size: 1 })
		expect(ids(first)).toEqual(['1'])
		const rest = run(store, { sort: desc, search_after: (first.hits as Hits).hits[0]!.sort })
		expect(ids(rest)).toEqual(['3', '2', '4'])

		expect(() => run(store, { search_after: [1] })).toThrow(OpenSearchError)
	})

	it('rejects sorting on text fields, scripts and nested sorts', () => {
		let caught: unknown
		try {
			run(store, { sort: ['name'] })
		} catch (error) {
			caught = error
		}
		expect((caught as OpenSearchError).rootCause.type).toBe('illegal_argument_exception')
		expect((caught as OpenSearchError).reason).toContain('Text fields are not optimised')
		expect(() => run(store, { sort: [{ _script: {} }] })).toThrow(/type of "number" or "string"/)
		expect(() => run(store, { sort: [{ rank: { order: 'asc', nested: { path: 'x' } } }] })).toThrow(
			/nested sorting/
		)
		expect(() => run(store, { sort: ['missing'] })).toThrow(/No mapping found for \[missing\]/)
	})
})
