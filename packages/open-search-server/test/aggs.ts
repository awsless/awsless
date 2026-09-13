import { OpenSearchError } from '../src/errors'
import { makeStore, run } from './_helpers'

const mappings = {
	properties: {
		category: { type: 'keyword' },
		price: { type: 'double' },
		qty: { type: 'integer' },
		sold: { type: 'boolean' },
		when: { type: 'date' },
		title: { type: 'text' },
		lines: { type: 'nested', properties: { sku: { type: 'keyword' }, amount: { type: 'integer' } } },
	},
}

const day = (n: number) => Date.UTC(2024, 0, n)

const docs: Array<[string, Record<string, unknown>]> = [
	[
		'1',
		{
			category: 'books',
			price: 10,
			qty: 1,
			sold: true,
			when: '2024-01-01',
			title: 'a',
			lines: [
				{ sku: 'x', amount: 1 },
				{ sku: 'y', amount: 2 },
			],
		},
	],
	['2', { category: 'books', price: 20, qty: 2, sold: false, when: '2024-01-02', lines: [{ sku: 'x', amount: 3 }] }],
	['3', { category: 'games', price: 30, qty: 3, sold: true, when: '2024-01-02T12:00:00Z' }],
	['4', { category: ['games', 'toys'], price: 40, sold: true, when: '2024-01-05' }],
	['5', { price: 50, when: '2024-02-01' }],
]

const aggsOf = (body: Record<string, unknown>, store = base.store) =>
	run(store, { size: 0, ...body }).aggregations as Record<string, any>

const base = makeStore('test', mappings, docs)

describe('aggregations', () => {
	it('metrics', () => {
		const result = aggsOf({
			aggs: {
				min: { min: { field: 'price' } },
				max: { max: { field: 'price' } },
				sum: { sum: { field: 'price' } },
				avg: { avg: { field: 'price' } },
				count: { value_count: { field: 'qty' } },
				card: { cardinality: { field: 'category' } },
				stats: { stats: { field: 'qty' } },
				missing: { avg: { field: 'qty', missing: 10 } },
				latest: { max: { field: 'when' } },
				empty: { avg: { field: 'nope' } },
			},
		})
		expect(result.min).toEqual({ value: 10 })
		expect(result.max).toEqual({ value: 50 })
		expect(result.sum).toEqual({ value: 150 })
		expect(result.avg).toEqual({ value: 30 })
		expect(result.count).toEqual({ value: 3 })
		expect(result.card).toEqual({ value: 3 })
		expect(result.stats).toEqual({ count: 3, min: 1, max: 3, avg: 2, sum: 6 })
		expect(result.missing).toEqual({ value: (1 + 2 + 3 + 10 + 10) / 5 })
		expect(result.latest).toEqual({ value: Date.UTC(2024, 1, 1), value_as_string: '2024-02-01T00:00:00.000Z' })
		expect(result.empty).toEqual({ value: null })
	})

	it('terms with ordering, size, missing and sub aggregations', () => {
		const result = aggsOf({
			aggs: {
				cats: {
					terms: { field: 'category' },
					aggs: { total: { sum: { field: 'price' } } },
				},
				top: { terms: { field: 'category', size: 1 } },
				byKey: { terms: { field: 'category', order: { _key: 'desc' } } },
				bySub: {
					terms: { field: 'category', order: { 'total.value': 'asc' } },
					aggs: { total: { sum: { field: 'price' } } },
				},
				withMissing: { terms: { field: 'category', missing: 'none' } },
				sold: { terms: { field: 'sold' } },
				days: { terms: { field: 'when', size: 2 } },
				only: { terms: { field: 'category', include: ['toys'] } },
				minCount: { terms: { field: 'category', min_doc_count: 2 } },
			},
		})
		expect(result.cats).toEqual({
			doc_count_error_upper_bound: 0,
			sum_other_doc_count: 0,
			buckets: [
				{ key: 'books', doc_count: 2, total: { value: 30 } },
				{ key: 'games', doc_count: 2, total: { value: 70 } },
				{ key: 'toys', doc_count: 1, total: { value: 40 } },
			],
		})
		expect(result.top.buckets).toEqual([{ key: 'books', doc_count: 2 }])
		expect(result.top.sum_other_doc_count).toBe(3)
		expect(result.byKey.buckets.map((b: { key: string }) => b.key)).toEqual(['toys', 'games', 'books'])
		expect(result.bySub.buckets.map((b: { key: string }) => b.key)).toEqual(['books', 'toys', 'games'])
		expect(result.withMissing.buckets.find((b: { key: string }) => b.key === 'none')).toEqual({
			key: 'none',
			doc_count: 1,
		})
		expect(result.sold.buckets).toEqual([
			{ key: 1, key_as_string: 'true', doc_count: 3 },
			{ key: 0, key_as_string: 'false', doc_count: 1 },
		])
		expect(result.days.buckets[0]).toEqual({ key: day(1), key_as_string: '2024-01-01T00:00:00.000Z', doc_count: 1 })
		expect(result.only.buckets).toEqual([{ key: 'toys', doc_count: 1 }])
		expect(result.minCount.buckets).toHaveLength(2)
	})

	it('filter, filters, range, date_range and global', () => {
		const result = aggsOf({
			query: { term: { category: 'books' } },
			aggs: {
				cheap: { filter: { range: { price: { lt: 15 } } }, aggs: { avg: { avg: { field: 'price' } } } },
				named: { filters: { filters: { sold: { term: { sold: true } }, unsold: { term: { sold: false } } } } },
				anon: { filters: { filters: [{ term: { sold: true } }] } },
				ranges: {
					range: { field: 'price', ranges: [{ to: 15 }, { from: 15, to: 25, key: 'mid' }, { from: 25 }] },
				},
				dates: { date_range: { field: 'when', ranges: [{ from: '2024-01-02', to: '2024-01-03' }] } },
				all: { global: {}, aggs: { total: { value_count: { field: 'price' } } } },
			},
		})
		expect(result.cheap).toEqual({ doc_count: 1, avg: { value: 10 } })
		expect(result.named.buckets).toEqual({ sold: { doc_count: 1 }, unsold: { doc_count: 1 } })
		expect(result.anon.buckets).toEqual([{ doc_count: 1 }])
		expect(result.ranges.buckets).toEqual([
			{ key: '*-15.0', to: 15, doc_count: 1 },
			{ key: 'mid', from: 15, to: 25, doc_count: 1 },
			{ key: '25.0-*', from: 25, doc_count: 0 },
		])
		expect(result.dates.buckets[0]).toMatchObject({
			from: day(2),
			to: day(3),
			doc_count: 1,
			from_as_string: '2024-01-02T00:00:00.000Z',
		})
		expect(result.all).toEqual({ doc_count: 5, total: { value: 5 } })
	})

	it('histogram and date_histogram', () => {
		const result = aggsOf({
			aggs: {
				prices: { histogram: { field: 'price', interval: 20 } },
				sparse: { histogram: { field: 'qty', interval: 1, min_doc_count: 1 } },
				daily: { date_histogram: { field: 'when', calendar_interval: 'day', min_doc_count: 1 } },
				twelve: { date_histogram: { field: 'when', fixed_interval: '12h', min_doc_count: 1 } },
				monthly: { date_histogram: { field: 'when', calendar_interval: 'month' } },
			},
		})
		expect(result.prices.buckets).toEqual([
			{ key: 0, doc_count: 1 },
			{ key: 20, doc_count: 2 },
			{ key: 40, doc_count: 2 },
		])
		expect(result.sparse.buckets).toEqual([
			{ key: 1, doc_count: 1 },
			{ key: 2, doc_count: 1 },
			{ key: 3, doc_count: 1 },
		])
		expect(result.daily.buckets).toEqual([
			{ key_as_string: '2024-01-01T00:00:00.000Z', key: day(1), doc_count: 1 },
			{ key_as_string: '2024-01-02T00:00:00.000Z', key: day(2), doc_count: 2 },
			{ key_as_string: '2024-01-05T00:00:00.000Z', key: day(5), doc_count: 1 },
			{ key_as_string: '2024-02-01T00:00:00.000Z', key: Date.UTC(2024, 1, 1), doc_count: 1 },
		])
		expect(result.twelve.buckets.map((b: { doc_count: number }) => b.doc_count)).toEqual([1, 1, 1, 1, 1])
		expect(result.monthly.buckets).toEqual([
			{ key_as_string: '2024-01-01T00:00:00.000Z', key: day(1), doc_count: 4 },
			{ key_as_string: '2024-02-01T00:00:00.000Z', key: Date.UTC(2024, 1, 1), doc_count: 1 },
		])
	})

	it('nested, reverse_nested and top_hits', () => {
		const result = aggsOf({
			aggs: {
				lines: {
					nested: { path: 'lines' },
					aggs: {
						skus: {
							terms: { field: 'lines.sku' },
							aggs: { amount: { sum: { field: 'lines.amount' } }, docs: { reverse_nested: {} } },
						},
					},
				},
				best: { top_hits: { size: 2, sort: [{ price: 'desc' }], _source: ['price'] } },
			},
		})
		expect(result.lines.doc_count).toBe(3)
		expect(result.lines.skus.buckets).toEqual([
			{ key: 'x', doc_count: 2, amount: { value: 4 }, docs: { doc_count: 2 } },
			{ key: 'y', doc_count: 1, amount: { value: 2 }, docs: { doc_count: 1 } },
		])
		expect(result.best.hits.total).toEqual({ value: 5, relation: 'eq' })
		expect(result.best.hits.hits).toEqual([
			{ _index: 'test', _id: '5', _score: null, _source: { price: 50 }, sort: [50] },
			{ _index: 'test', _id: '4', _score: null, _source: { price: 40 }, sort: [40] },
		])
	})

	it('rejects unsupported aggregations and text fields', () => {
		for (const type of [
			'percentiles',
			'composite',
			'significant_terms',
			'multi_terms',
			'geo_distance',
			'bucket_sort',
		]) {
			let caught: unknown
			try {
				aggsOf({ aggs: { x: { [type]: { field: 'price' } } } })
			} catch (error) {
				caught = error
			}
			expect(caught).toBeInstanceOf(OpenSearchError)
			expect((caught as OpenSearchError).reason).toContain(`"${type}" aggregation`)
		}
		expect(() => aggsOf({ aggs: { x: { terms: { field: 'title' } } } })).toThrow(/Text fields are not optimised/)
		expect(() => aggsOf({ aggs: { x: { terms: { field: 'category', include: 'b.*' } } } })).toThrow(
			/regular expressions/
		)
		expect(() =>
			aggsOf({ aggs: { x: { sum: { field: 'price' }, aggs: { y: { max: { field: 'price' } } } } } })
		).toThrow(/sub-aggregations/)
	})
})
