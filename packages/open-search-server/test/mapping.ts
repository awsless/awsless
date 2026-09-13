import { OpenSearchError } from '../src/errors'
import { ids, makeStore, run } from './_helpers'

describe('mapping', () => {
	it('grows the mapping dynamically like OpenSearch', () => {
		const { store, index } = makeStore('test')
		index.put('1', {
			name: 'Jack',
			age: 30,
			score: 1.5,
			ok: true,
			when: '2024-01-01T10:00:00Z',
			tags: ['a', 'b'],
			nested: { deep: { value: 'x' } },
			list: [{ id: 1 }, { id: 2 }],
			nothing: null,
		})

		expect(index.mapping.properties).toMatchObject({
			name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
			age: { type: 'long' },
			score: { type: 'float' },
			ok: { type: 'boolean' },
			when: { type: 'date' },
			tags: { type: 'text' },
			nested: { properties: { deep: { properties: { value: { type: 'text' } } } } },
			list: { properties: { id: { type: 'long' } } },
		})
		expect(index.mapping.properties!.nothing).toBeUndefined()

		expect(ids(run(store, { query: { term: { 'name.keyword': 'Jack' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { match: { name: 'jack' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { range: { when: { gte: '2024-01-01' } } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { term: { 'list.id': 2 } } }))).toEqual(['1'])
	})

	it('honours dynamic strict and false', () => {
		const { index } = makeStore('test', { dynamic: 'strict', properties: { a: { type: 'keyword' } } })
		let caught: unknown
		try {
			index.put('1', { a: 'x', b: 'y' })
		} catch (error) {
			caught = error
		}
		expect(caught).toBeInstanceOf(OpenSearchError)
		expect((caught as OpenSearchError).type).toBe('strict_dynamic_mapping_exception')
		expect((caught as OpenSearchError).reason).toBe(
			'mapping set to strict, dynamic introduction of [b] within [_doc] is not allowed'
		)
		expect(index.docs.size).toBe(0)

		const { store, index: loose } = makeStore('test', { dynamic: false, properties: { a: { type: 'keyword' } } })
		loose.put('1', { a: 'x', b: 'y' })
		expect(loose.mapping.properties!.b).toBeUndefined()
		expect(ids(run(store, { query: { term: { b: 'y' } } }))).toEqual([])
		expect(loose.get('1')!.source).toEqual({ a: 'x', b: 'y' })
	})

	it('coerces numeric strings and booleans, rejects garbage', () => {
		const { index } = makeStore('test', {
			properties: { n: { type: 'long' }, d: { type: 'double' }, b: { type: 'boolean' }, t: { type: 'date' } },
		})
		index.put('1', { n: '10', d: '1.5', b: 'true', t: 1700000000000 })
		expect(index.get('1')!.fields.get('n')).toEqual([10])
		expect(index.get('1')!.fields.get('d')).toEqual([1.5])
		expect(index.get('1')!.fields.get('b')).toEqual([true])
		expect(index.get('1')!.fields.get('t')).toEqual([1700000000000])

		for (const bad of [{ n: 'abc' }, { b: 'yes' }, { t: 'not a date' }, { n: { x: 1 } }]) {
			let caught: unknown
			try {
				index.put('2', bad)
			} catch (error) {
				caught = error
			}
			expect((caught as OpenSearchError).type).toBe('mapper_parsing_exception')
		}
	})

	it('supports date formats, ignore_above, null_value, copy_to and normalizers', () => {
		const { store, index } = makeStore(
			'test',
			{
				properties: {
					epoch: { type: 'date', format: 'epoch_millis' },
					short: { type: 'keyword', ignore_above: 3 },
					nv: { type: 'keyword', null_value: 'NULL' },
					first: { type: 'text', copy_to: 'all' },
					last: { type: 'text', copy_to: 'all' },
					all: { type: 'text' },
					code: { type: 'keyword', normalizer: 'lower' },
				},
			},
			[],
			{ analysis: { normalizer: { lower: { type: 'custom', filter: ['lowercase'] } } } }
		)
		index.put('1', { epoch: '1700000000000', short: 'abcd', nv: null, first: 'Jack', last: 'Sparrow', code: 'ABC' })
		expect(index.get('1')!.fields.get('epoch')).toEqual([1700000000000])
		expect(index.get('1')!.fields.get('short')).toBeUndefined()
		expect(index.get('1')!.fields.get('nv')).toEqual(['NULL'])
		expect(ids(run(store, { query: { match: { all: { query: 'jack sparrow', operator: 'and' } } } }))).toEqual([
			'1',
		])
		expect(ids(run(store, { query: { term: { code: 'abc' } } }))).toEqual(['1'])
		expect(ids(run(store, { query: { term: { code: 'ABC' } } }))).toEqual(['1'])
		expect(() => index.put('2', { epoch: '2024-01-01' })).toThrow(OpenSearchError)
	})

	it('rejects unsupported field types, options and mapping changes', () => {
		expect(() => makeStore('test', { properties: { g: { type: 'geo_point' } } })).toThrow(/geo_point/)
		expect(() => makeStore('test', { properties: { g: { type: 'knn_vector', dimension: 3 } } })).toThrow(
			/knn_vector/
		)
		expect(() => makeStore('test', { properties: { d: { type: 'date', format: 'yyyy/MM/dd' } } })).toThrow(
			/yyyy\/MM\/dd/
		)
		expect(() => makeStore('test', { properties: { t: { type: 'text', analyzer: 'french' } } })).toThrow(/french/)
		expect(() => makeStore('test', { properties: { t: { type: 'keyword', bogus: 1 } } })).toThrow(/bogus/)
		expect(() => makeStore('test', { dynamic_templates: [] })).toThrow(/dynamic_templates/)

		const { index } = makeStore('test', { properties: { a: { type: 'text' } } })
		let caught: unknown
		try {
			index.putMapping({ properties: { a: { type: 'keyword' } } })
		} catch (error) {
			caught = error
		}
		expect((caught as OpenSearchError).type).toBe('illegal_argument_exception')
		expect((caught as OpenSearchError).reason).toContain('cannot be changed from type [text] to [keyword]')

		index.putMapping({
			properties: { b: { type: 'long' }, a: { type: 'text', fields: { raw: { type: 'keyword' } } } },
		})
		expect(index.mapping.properties!.b).toEqual({ type: 'long' })
		expect(index.mapping.properties!.a!.fields!.raw).toEqual({ type: 'keyword' })
	})

	it('rejects unsupported index settings', () => {
		expect(() => makeStore('test', undefined, [], { 'index.knn': true })).toThrow(/knn/)
		expect(() => makeStore('test', undefined, [], { index: { sort: { field: 'x' } } })).toThrow(/sort/)
		const { index } = makeStore('test', undefined, [], { number_of_shards: 3, index: { refresh_interval: '1s' } })
		expect(index.describe().settings.index).toMatchObject({ number_of_shards: 3, refresh_interval: '1s' })
	})
})
