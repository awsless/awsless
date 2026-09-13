import { Client, errors } from '@opensearch-project/opensearch'
import { OpenSearchServer } from '../src'

const { ResponseError } = errors

// The client types hits by their _source only; the mock returns the full shape.
type Hit = { _id: string; _score: number | null; sort?: unknown[] }
const hitsOf = (response: { body: { hits: { hits: unknown[] } } }) => response.body.hits.hits as Hit[]

const failure = async (promise: Promise<unknown>) => {
	try {
		await promise
	} catch (error) {
		if (error instanceof ResponseError) return error
		throw error
	}
	throw new Error('expected the request to fail')
}

describe('OpenSearchServer over HTTP', () => {
	const server = new OpenSearchServer()
	let client: Client

	beforeAll(async () => {
		await server.listen()
		client = new Client({ node: server.endpoint })
	})

	afterAll(async () => {
		await client.close()
		await server.close()
		await server.close()
	})

	beforeEach(() => server.reset())

	it('answers the readiness probes', async () => {
		const info = await client.info()
		expect(info.statusCode).toBe(200)
		expect(info.body.version.distribution).toBe('opensearch')
		expect((await client.ping()).body).toBe(true)
		expect((await client.cluster.health()).body.status).toBe('green')
		expect((await client.cat.health({ format: 'json' })).body[0]!.status).toBe('green')
		expect((await client.cat.indices({ format: 'json' })).body).toEqual([])
	})

	it('manages the index lifecycle', async () => {
		expect((await client.indices.exists({ index: 'users' })).body).toBe(false)
		await client.indices.create({
			index: 'users',
			body: { mappings: { properties: { name: { type: 'keyword' } } } },
		})
		expect((await client.indices.exists({ index: 'users' })).body).toBe(true)

		const dup = await failure(client.indices.create({ index: 'users' }))
		expect(dup.statusCode).toBe(400)
		expect(dup.body.error.type).toBe('resource_already_exists_exception')

		await client.indices.putMapping({ index: 'users', body: { properties: { age: { type: 'integer' } } } })
		const mapping = await client.indices.getMapping({ index: 'users' })
		expect(mapping.body.users!.mappings.properties).toEqual({ name: { type: 'keyword' }, age: { type: 'integer' } })

		const conflict = await failure(
			client.indices.putMapping({ index: 'users', body: { properties: { name: { type: 'text' } } } })
		)
		expect(conflict.body.error.type).toBe('illegal_argument_exception')

		const described = await client.indices.get({ index: 'users' })
		expect(described.body.users!.settings!.index!.provided_name).toBe('users')

		const cat = await client.cat.indices({ format: 'json' })
		expect(cat.body).toHaveLength(1)
		expect(cat.body[0]).toMatchObject({ index: 'users', health: 'green', 'docs.count': '0' })

		await client.indices.refresh({ index: 'users' })
		await client.indices.delete({ index: 'users' })
		const missing = await failure(client.indices.delete({ index: 'users' }))
		expect(missing.statusCode).toBe(404)
		expect(missing.body.error.type).toBe('index_not_found_exception')
		expect(missing.body.error.reason).toBe('no such index [users]')
	})

	it('creates, reads, updates and deletes documents', async () => {
		const created = await client.index({ index: 'docs', id: '1', body: { name: 'one', n: 1 }, refresh: true })
		expect(created.statusCode).toBe(201)
		expect(created.body).toMatchObject({ _index: 'docs', _id: '1', _version: 1, result: 'created' })

		const updated = await client.index({ index: 'docs', id: '1', body: { name: 'uno', n: 1 } })
		expect(updated.body).toMatchObject({ _version: 2, result: 'updated' })

		const auto = await client.index({ index: 'docs', body: { name: 'two' } })
		expect(auto.body._id).toHaveLength(20)

		const got = await client.get({ index: 'docs', id: '1' })
		expect(got.body).toMatchObject({
			_index: 'docs',
			_id: '1',
			_version: 2,
			found: true,
			_source: { name: 'uno', n: 1 },
		})
		expect((await client.getSource({ index: 'docs', id: '1' })).body).toEqual({ name: 'uno', n: 1 })
		expect((await client.exists({ index: 'docs', id: '1' })).body).toBe(true)
		expect((await client.exists({ index: 'docs', id: 'nope' })).body).toBe(false)

		const missing = await failure(client.get({ index: 'docs', id: 'nope' }))
		expect(missing.statusCode).toBe(404)
		expect(missing.body).toEqual({ _index: 'docs', _id: 'nope', found: false })

		const create = await failure(client.create({ index: 'docs', id: '1', body: { name: 'dupe' } }))
		expect(create.statusCode).toBe(409)
		expect(create.body.error.type).toBe('version_conflict_engine_exception')

		const deleted = await client.delete({ index: 'docs', id: '1' })
		expect(deleted.body.result).toBe('deleted')
		const gone = await failure(client.delete({ index: 'docs', id: '1' }))
		expect(gone.statusCode).toBe(404)
		expect(gone.body.result).toBe('not_found')

		const mget = await client.mget({ index: 'docs', body: { ids: ['1', auto.body._id] } })
		expect(mget.body.docs[0]).toEqual({ _index: 'docs', _id: '1', found: false })
		expect(mget.body.docs[1]).toMatchObject({ _id: auto.body._id, found: true, _source: { name: 'two' } })
	})

	it('updates with doc merging and upserts', async () => {
		await client.index({ index: 'docs', id: '1', body: { name: 'one', meta: { a: 1, b: 2 }, list: [1, 2] } })
		const updated = await client.update({ index: 'docs', id: '1', body: { doc: { meta: { b: 3 }, list: [9] } } })
		expect(updated.body).toMatchObject({ result: 'updated', _version: 2 })
		expect((await client.get({ index: 'docs', id: '1' })).body._source).toEqual({
			name: 'one',
			meta: { a: 1, b: 3 },
			list: [9],
		})

		const noop = await client.update({ index: 'docs', id: '1', body: { doc: { name: 'one' } } })
		expect(noop.body.result).toBe('noop')

		const missing = await failure(client.update({ index: 'docs', id: '2', body: { doc: { name: 'two' } } }))
		expect(missing.statusCode).toBe(404)
		expect(missing.body.error.type).toBe('document_missing_exception')

		const upserted = await client.update({
			index: 'docs',
			id: '2',
			body: { doc: { name: 'two' }, doc_as_upsert: true },
		})
		expect(upserted.body.result).toBe('created')
		const withUpsert = await client.update({
			index: 'docs',
			id: '3',
			body: { doc: { name: 'x' }, upsert: { name: 'three' } },
		})
		expect(withUpsert.body.result).toBe('created')
		expect((await client.get({ index: 'docs', id: '3' })).body._source).toEqual({ name: 'three' })

		const script = await failure(
			client.update({ index: 'docs', id: '1', body: { script: { source: 'ctx._source.n++' } } })
		)
		expect(script.statusCode).toBe(400)
		expect(script.body.error.reason).toContain('scripted updates')
	})

	it('runs bulk requests with per item errors', async () => {
		await client.index({ index: 'docs', id: 'existing', body: { name: 'existing' } })
		const response = await client.bulk({
			refresh: true,
			body: [
				{ index: { _index: 'docs', _id: '1' } },
				{ name: 'one' },
				{ create: { _index: 'docs', _id: 'existing' } },
				{ name: 'dupe' },
				{ update: { _index: 'docs', _id: 'missing' } },
				{ doc: { name: 'x' } },
				{ update: { _index: 'docs', _id: '1' } },
				{ doc: { extra: true } },
				{ delete: { _index: 'docs', _id: 'existing' } },
				{ delete: { _index: 'docs', _id: 'never' } },
				{ index: { _index: 'fresh' } },
				{ name: 'auto created index' },
			],
		})

		expect(response.body.errors).toBe(true)
		const items = response.body.items
		expect(items[0]!.index).toMatchObject({ _index: 'docs', _id: '1', result: 'created', status: 201, _version: 1 })
		expect(items[1]!.create).toMatchObject({
			_id: 'existing',
			status: 409,
			error: { type: 'version_conflict_engine_exception' },
		})
		expect(items[2]!.update).toMatchObject({
			_id: 'missing',
			status: 404,
			error: { type: 'document_missing_exception' },
		})
		expect(items[3]!.update).toMatchObject({ _id: '1', result: 'updated', status: 200 })
		expect(items[4]!.delete).toMatchObject({ _id: 'existing', result: 'deleted', status: 200 })
		expect(items[5]!.delete).toMatchObject({ _id: 'never', result: 'not_found', status: 404 })
		expect(items[6]!.index).toMatchObject({ _index: 'fresh', result: 'created', status: 201 })
		expect((await client.indices.exists({ index: 'fresh' })).body).toBe(true)

		const scoped = await client.bulk({ index: 'docs', body: [{ index: { _id: '9' } }, { name: 'nine' }] })
		expect(scoped.body.errors).toBe(false)
		expect((await client.count({ index: 'docs' })).body.count).toBe(2)
	})

	it('searches with the query DSL, sorts and pages with search_after', async () => {
		await client.indices.create({
			index: 'people',
			body: {
				mappings: {
					properties: {
						name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
						age: { type: 'integer' },
						role: { type: 'keyword' },
						joined: { type: 'date' },
					},
				},
			},
		})
		const people = [
			{ name: 'Alice Smith', age: 30, role: 'admin', joined: '2024-01-01' },
			{ name: 'Bob Jones', age: 25, role: 'user', joined: '2024-02-01' },
			{ name: 'Carol Smith', age: 35, role: 'user', joined: '2024-03-01' },
			{ name: 'Dave Brown', age: 40, role: 'user', joined: '2024-04-01' },
		]
		await client.bulk({ body: people.flatMap((p, i) => [{ index: { _index: 'people', _id: String(i + 1) } }, p]) })

		const smiths = await client.search({ index: 'people', body: { query: { match: { name: 'smith' } } } })
		expect(smiths.body.hits.total).toEqual({ value: 2, relation: 'eq' })
		expect(
			hitsOf(smiths)
				.map(h => h._id)
				.toSorted()
		).toEqual(['1', '3'])
		expect(smiths.body.hits.max_score).toBeGreaterThan(0)

		const filtered = await client.search({
			index: 'people',
			body: {
				query: {
					bool: {
						must: [{ term: { role: 'user' } }],
						filter: [{ range: { age: { gte: 30 } } }],
						must_not: [{ term: { 'name.keyword': 'Dave Brown' } }],
					},
				},
			},
		})
		expect(hitsOf(filtered).map(h => h._id)).toEqual(['3'])

		const qs = await client.search({
			index: 'people',
			body: { query: { query_string: { query: 'name:(alice OR bob) AND age:<30' } } },
		})
		expect(hitsOf(qs).map(h => h._id)).toEqual(['2'])

		const sorted = await client.search({ index: 'people', body: { sort: [{ age: 'desc' }], size: 2 } })
		expect(hitsOf(sorted).map(h => h._id)).toEqual(['4', '3'])
		expect(hitsOf(sorted)[0]!._score).toBeNull()
		expect(hitsOf(sorted)[1]!.sort).toEqual([35])

		const cursor = Buffer.from(JSON.stringify(hitsOf(sorted)[1]!.sort)).toString('base64')
		const next = await client.search({
			index: 'people',
			body: {
				sort: [{ age: 'desc' }],
				size: 2,
				search_after: JSON.parse(Buffer.from(cursor, 'base64').toString()),
			},
		})
		expect(hitsOf(next).map(h => h._id)).toEqual(['1', '2'])

		const viaParams = await client.search({ index: 'people', q: 'role:admin', size: 1 })
		expect(hitsOf(viaParams).map(h => h._id)).toEqual(['1'])

		const all = await client.search({ body: { query: { match_all: {} } } })
		expect(all.body.hits.total).toEqual({ value: 4, relation: 'eq' })
	})

	it('counts, deletes by query and aggregates', async () => {
		await client.bulk({
			index: 'sales',
			body: [
				{ index: { _id: '1' } },
				{ region: 'eu', amount: 10, day: '2024-01-01' },
				{ index: { _id: '2' } },
				{ region: 'eu', amount: 20, day: '2024-01-02' },
				{ index: { _id: '3' } },
				{ region: 'us', amount: 30, day: '2024-01-02' },
			],
		})

		expect((await client.count({ index: 'sales' })).body.count).toBe(3)
		expect(
			(await client.count({ index: 'sales', body: { query: { term: { 'region.keyword': 'eu' } } } })).body.count
		).toBe(2)

		const aggs = await client.search({
			index: 'sales',
			body: {
				size: 0,
				aggs: {
					regions: { terms: { field: 'region.keyword' }, aggs: { total: { sum: { field: 'amount' } } } },
					days: { date_histogram: { field: 'day', calendar_interval: 'day' } },
					stats: { stats: { field: 'amount' } },
				},
			},
		})
		const result = aggs.body.aggregations as Record<string, any>
		expect(result.regions.buckets).toEqual([
			{ key: 'eu', doc_count: 2, total: { value: 30 } },
			{ key: 'us', doc_count: 1, total: { value: 30 } },
		])
		expect(result.days.buckets.map((b: { doc_count: number }) => b.doc_count)).toEqual([1, 2])
		expect(result.stats).toEqual({ count: 3, min: 10, max: 30, avg: 20, sum: 60 })

		const deleted = await client.deleteByQuery({
			index: 'sales',
			body: { query: { range: { amount: { gte: 20 } } } },
		})
		expect(deleted.body).toMatchObject({ deleted: 2, total: 2 })
		expect((await client.count({ index: 'sales' })).body.count).toBe(1)
	})

	it('reports OpenSearch shaped errors', async () => {
		const missing = await failure(client.search({ index: 'nothing', body: {} }))
		expect(missing.statusCode).toBe(404)
		expect(missing.body.error.type).toBe('index_not_found_exception')
		expect(missing.body.error.root_cause[0]!.type).toBe('index_not_found_exception')
		expect(missing.body.status).toBe(404)
		expect(missing.message).toContain('no such index [nothing]')

		await client.indices.create({
			index: 'strict',
			body: { mappings: { dynamic: 'strict', properties: { a: { type: 'keyword' } } } },
		})
		const strict = await failure(client.index({ index: 'strict', id: '1', body: { b: 1 } }))
		expect(strict.statusCode).toBe(400)
		expect(strict.body.error.type).toBe('strict_dynamic_mapping_exception')

		const parse = await failure(client.index({ index: 'strict', id: '1', body: { a: { nested: true } } }))
		expect(parse.body.error.type).toBe('mapper_parsing_exception')

		const bad = await failure(
			client.search({ index: 'strict', body: { query: { query_string: { query: 'a:(' } } } })
		)
		expect(bad.statusCode).toBe(400)
		expect(bad.body.error.type).toBe('search_phase_execution_exception')
		expect(bad.body.error.root_cause[0]!.type).toBe('query_shard_exception')

		const method = await failure(client.transport.request({ method: 'DELETE', path: '/strict/_search' }))
		expect(method.statusCode).toBe(405)
	})

	it('names unsupported features in a 400', async () => {
		await client.index({ index: 'docs', id: '1', body: { name: 'one' } })
		const clause = await failure(
			client.search({ index: 'docs', body: { query: { function_score: { query: { match_all: {} } } } } })
		)
		expect(clause.statusCode).toBe(400)
		expect(clause.body.error.root_cause[0]!.reason).toBe(
			'The local OpenSearch server does not support the "function_score" query.'
		)
		expect(clause.message).toContain('function_score')

		const body = await failure(client.search({ index: 'docs', body: { highlight: { fields: { name: {} } } } }))
		expect(body.body.error.reason).toContain('"highlight" search body option')

		const agg = await failure(
			client.search({ index: 'docs', body: { aggs: { p: { percentiles: { field: 'x' } } } } })
		)
		expect(agg.body.error.reason).toContain('"percentiles" aggregation')

		const endpoint = await failure(client.transport.request({ method: 'POST', path: '/docs/_explain/1', body: {} }))
		expect(endpoint.statusCode).toBe(400)
		expect(endpoint.body.error.reason).toContain('POST /docs/_explain/1')

		const cat = await failure(client.cat.indices({ format: 'yaml' }))
		expect(cat.statusCode).toBe(400)
	})

	it('refuses to listen twice and reports the bound port', async () => {
		expect(server.port).toBeGreaterThan(0)
		expect(server.endpoint).toBe(`http://127.0.0.1:${server.port}`)
		await expect(server.listen()).rejects.toThrow('already listening')
	})
})
