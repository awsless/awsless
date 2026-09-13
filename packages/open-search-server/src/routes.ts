import { countDocuments, deleteByQuery, search } from './engine/search'
import { applySourceFilter, isPlainObject, parseSourceFilter, Source } from './engine/source'
import { generateId, Index, Store, WriteResult } from './engine/store'
import { illegalArgument, indexNotFound, OpenSearchError, unsupported, versionConflict } from './errors'

export type Request = {
	method: string
	segments: string[]
	params: URLSearchParams
	rawBody: string
	body: unknown
}

export type Response = { status: number; body?: unknown }

// Only the routes that declare :index or :id read them, so the loose type
// keeps every handler signature the same.
type PathParams = { index: string; id: string }

type Handler = (request: Request, path: PathParams) => Response

type Route = { methods: string[]; pattern: string[]; handler: Handler }

const CLUSTER_NAME = 'awsless-local'
const CLUSTER_UUID = 'YwXa7Uh2QlOu0J2KcKmkTw'

const SHARDS = { total: 2, successful: 1, failed: 0 }

const ok = (body: unknown, status = 200): Response => ({ status, body })

const requireBody = (request: Request): Source => {
	if (!isPlainObject(request.body)) throw illegalArgument('request body is required')
	return request.body
}

const optionalBody = (request: Request): Source | undefined => {
	if (request.body === undefined) return undefined
	if (!isPlainObject(request.body)) throw illegalArgument('request body must be a JSON object')
	return request.body
}

const writeResponse = (index: Index, result: WriteResult) => ({
	_index: index.name,
	_id: result.doc.id,
	_version: result.doc.version,
	result: result.result,
	_shards: SHARDS,
	_seq_no: result.doc.seqNo,
	_primary_term: 1,
})

const getResponse = (index: Index, id: string, sourceFilter: ReturnType<typeof parseSourceFilter>) => {
	const doc = index.get(id)
	if (!doc) return { _index: index.name, _id: id, found: false }
	const source = applySourceFilter(doc.source, sourceFilter)
	return {
		_index: index.name,
		_id: id,
		_version: doc.version,
		_seq_no: doc.seqNo,
		_primary_term: 1,
		found: true,
		...(source !== undefined ? { _source: source } : {}),
	}
}

const sourceFilterFromParams = (params: URLSearchParams) => {
	const value = params.get('_source')
	const includes = params.get('_source_includes') ?? params.get('_source_include')
	const excludes = params.get('_source_excludes') ?? params.get('_source_exclude')
	if (includes || excludes) {
		return parseSourceFilter({ includes: includes?.split(',') ?? [], excludes: excludes?.split(',') ?? [] })
	}
	if (value === null) return undefined
	if (value === 'true') return undefined
	if (value === 'false') return false
	return parseSourceFilter(value.split(','))
}

// Bulk items report their own errors instead of failing the whole request.
type BulkItem = { action: string; meta: Source; source?: Source }

const parseBulkBody = (raw: string, defaultIndex: string | undefined): BulkItem[] => {
	const lines = raw.split('\n').filter(line => line.trim() !== '')
	const items: BulkItem[] = []

	for (let i = 0; i < lines.length; i++) {
		let actionLine: unknown
		try {
			actionLine = JSON.parse(lines[i]!)
		} catch {
			throw illegalArgument(`Malformed action/metadata line [${i + 1}], expected a JSON object`)
		}
		if (!isPlainObject(actionLine) || Object.keys(actionLine).length !== 1) {
			throw illegalArgument(`Malformed action/metadata line [${i + 1}], expected a single action`)
		}
		const action = Object.keys(actionLine)[0]!
		if (!['index', 'create', 'update', 'delete'].includes(action)) {
			throw illegalArgument(
				`Malformed action/metadata line [${i + 1}], expected one of [create, delete, index, update] but found [${action}]`
			)
		}
		const meta = isPlainObject(actionLine[action]) ? actionLine[action] : {}
		if (meta._index === undefined && defaultIndex === undefined) {
			throw illegalArgument('Validation Failed: 1: index is missing;')
		}
		meta._index ??= defaultIndex

		if (action === 'delete') {
			items.push({ action, meta })
			continue
		}

		const sourceLine = lines[++i]
		if (sourceLine === undefined) throw illegalArgument(`Validation Failed: 1: no requests added;`)
		let source: unknown
		try {
			source = JSON.parse(sourceLine)
		} catch {
			throw illegalArgument(`Malformed source line [${i + 1}], expected a JSON object`)
		}
		if (!isPlainObject(source)) throw illegalArgument(`Malformed source line [${i + 1}], expected a JSON object`)
		items.push({ action, meta, source })
	}

	return items
}

const bulkError = (error: unknown, index: string, id: string | undefined) => {
	if (!(error instanceof OpenSearchError)) throw error
	return {
		_index: index,
		_id: id ?? null,
		status: error.status,
		error: { type: error.type, reason: error.reason, index, index_uuid: '_na_', shard: '0' },
	}
}

const runBulk = (store: Store, request: Request, defaultIndex: string | undefined) => {
	const started = Date.now()
	const items = parseBulkBody(request.rawBody, defaultIndex)
	let errors = false

	const results = items.map(item => {
		const indexName = String(item.meta._index)
		const id = item.meta._id === undefined ? undefined : String(item.meta._id)

		try {
			if (item.action === 'delete') {
				const index = store.indices.get(indexName)
				if (!index) throw indexNotFound(indexName)
				if (id === undefined) throw illegalArgument('Validation Failed: 1: id is missing;')
				const doc = index.delete(id)
				return {
					delete: {
						_index: indexName,
						_id: id,
						_version: doc ? doc.version + 1 : 1,
						result: doc ? 'deleted' : 'not_found',
						_shards: SHARDS,
						_seq_no: doc?.seqNo ?? 0,
						_primary_term: 1,
						status: doc ? 200 : 404,
					},
				}
			}

			const index = store.getOrCreate(indexName)

			if (item.action === 'update') {
				if (id === undefined) throw illegalArgument('Validation Failed: 1: id is missing;')
				const result = index.update(id, item.source!)
				return { update: { ...writeResponse(index, result), status: 200 } }
			}

			const create = item.action === 'create' || item.meta.op_type === 'create'
			const result = index.put(id ?? generateId(), item.source!, { create })
			return {
				[item.action]: { ...writeResponse(index, result), status: result.result === 'created' ? 201 : 200 },
			}
		} catch (error) {
			errors = true
			return { [item.action]: bulkError(error, indexName, id) }
		}
	})

	return ok({ took: Date.now() - started, errors, items: results })
}

const catIndices = (store: Store, params: URLSearchParams, expression: string | undefined) => {
	const format = params.get('format') ?? 'text'
	if (format !== 'json') throw unsupported(`the "${format}" cat format (use format=json)`)

	const indices = expression === undefined ? [...store.indices.values()] : store.resolve(expression)
	return ok(
		indices.map(index => ({
			health: 'green',
			status: 'open',
			index: index.name,
			uuid: index.uuid,
			pri: '1',
			rep: '1',
			'docs.count': String(index.docs.size),
			'docs.deleted': '0',
			'store.size': '0b',
			'pri.store.size': '0b',
		}))
	)
}

const clusterHealth = (store: Store) => ({
	cluster_name: CLUSTER_NAME,
	status: 'green',
	timed_out: false,
	number_of_nodes: 1,
	number_of_data_nodes: 1,
	discovered_master: true,
	discovered_cluster_manager: true,
	active_primary_shards: store.indices.size,
	active_shards: store.indices.size,
	relocating_shards: 0,
	initializing_shards: 0,
	unassigned_shards: 0,
	delayed_unassigned_shards: 0,
	number_of_pending_tasks: 0,
	number_of_in_flight_fetch: 0,
	task_max_waiting_in_queue_millis: 0,
	active_shards_percent_as_number: 100,
})

const mgetDocs = (store: Store, request: Request, defaultIndex: string | undefined) => {
	const body = requireBody(request)
	const filter = sourceFilterFromParams(request.params)
	const entries: Array<{ index: string; id: string; filter: ReturnType<typeof parseSourceFilter> }> = []

	if (Array.isArray(body.ids)) {
		if (defaultIndex === undefined) throw illegalArgument('Validation Failed: 1: index is missing;')
		for (const id of body.ids) entries.push({ index: defaultIndex, id: String(id), filter })
	} else if (Array.isArray(body.docs)) {
		for (const doc of body.docs) {
			if (!isPlainObject(doc)) throw illegalArgument('docs entries must be objects')
			const index = doc._index === undefined ? defaultIndex : String(doc._index)
			if (index === undefined) throw illegalArgument('Validation Failed: 1: index is missing;')
			if (doc._id === undefined) throw illegalArgument('Validation Failed: 1: id is missing;')
			entries.push({
				index,
				id: String(doc._id),
				filter: doc._source === undefined ? filter : parseSourceFilter(doc._source),
			})
		}
	} else {
		throw illegalArgument('Validation Failed: 1: no documents to get;')
	}

	return ok({
		docs: entries.map(entry => {
			const index = store.indices.get(entry.index)
			if (!index) {
				const error = indexNotFound(entry.index)
				return {
					_index: entry.index,
					_id: entry.id,
					error: { type: error.type, reason: error.reason, index: entry.index },
				}
			}
			return getResponse(index, entry.id, entry.filter)
		}),
	})
}

const putDocument = (
	store: Store,
	request: Request,
	indexName: string,
	id: string | undefined,
	forceCreate: boolean
) => {
	const source = requireBody(request)
	const index = store.getOrCreate(indexName)
	const create = forceCreate || request.params.get('op_type') === 'create'
	if (create && id !== undefined && index.get(id)) throw versionConflict(indexName, id)
	const result = index.put(id ?? generateId(), source, { create })
	return ok(writeResponse(index, result), result.result === 'created' ? 201 : 200)
}

export const createRoutes = (store: Store): Route[] => {
	const route = (methods: string, pattern: string, handler: Handler): Route => ({
		methods: methods.split(','),
		pattern: pattern.split('/').filter(Boolean),
		handler,
	})

	const searchHandler: Handler = (request, path) => {
		return ok(search(store, { indices: path.index, body: optionalBody(request) ?? {}, params: request.params }))
	}

	const countHandler: Handler = (request, path) => {
		return ok({
			count: countDocuments(store, path.index, optionalBody(request), request.params),
			_shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
		})
	}

	return [
		route('GET', '/', () =>
			ok({
				name: 'awsless-local-node',
				cluster_name: CLUSTER_NAME,
				cluster_uuid: CLUSTER_UUID,
				version: {
					distribution: 'opensearch',
					number: '3.5.0',
					build_type: 'tar',
					build_hash: 'local',
					build_date: '2026-01-01T00:00:00.000Z',
					build_snapshot: false,
					lucene_version: '10.3.1',
					minimum_wire_compatibility_version: '2.19.0',
					minimum_index_compatibility_version: '2.0.0',
				},
				tagline: 'The OpenSearch Project: https://opensearch.org/',
			})
		),
		route('HEAD', '/', () => ok(undefined)),
		route('GET', '/_cluster/health', () => ok(clusterHealth(store))),
		route('GET', '/_cluster/health/:index', (_request, path) => {
			store.resolve(path.index)
			return ok(clusterHealth(store))
		}),
		route('GET', '/_cat/health', request => {
			if ((request.params.get('format') ?? 'text') !== 'json')
				throw unsupported('the text cat format (use format=json)')
			const now = Date.now()
			return ok([
				{
					epoch: String(Math.floor(now / 1000)),
					timestamp: new Date(now).toISOString().slice(11, 19),
					cluster: CLUSTER_NAME,
					status: 'green',
					'node.total': '1',
					'node.data': '1',
					discovered_cluster_manager: 'true',
					shards: String(store.indices.size),
					pri: String(store.indices.size),
					relo: '0',
					init: '0',
					unassign: '0',
					pending_tasks: '0',
					max_task_wait_time: '-',
					active_shards_percent: '100.0%',
				},
			])
		}),
		route('GET', '/_cat/indices', request => catIndices(store, request.params, undefined)),
		route('GET', '/_cat/indices/:index', (request, path) => catIndices(store, request.params, path.index)),

		route('POST,PUT', '/_bulk', request => runBulk(store, request, undefined)),
		route('POST,PUT', '/:index/_bulk', (request, path) => runBulk(store, request, path.index)),
		route('GET,POST', '/_mget', request => mgetDocs(store, request, undefined)),
		route('GET,POST', '/:index/_mget', (request, path) => mgetDocs(store, request, path.index)),
		route('GET,POST', '/_search', searchHandler),
		route('GET,POST', '/:index/_search', searchHandler),
		route('GET,POST', '/_count', countHandler),
		route('GET,POST', '/:index/_count', countHandler),
		route('GET,POST', '/_refresh', () => ok({ _shards: SHARDS })),
		route('GET,POST', '/:index/_refresh', (_request, path) => {
			store.resolve(path.index)
			return ok({ _shards: SHARDS })
		}),
		route('GET', '/_mapping', () => {
			const result: Source = {}
			for (const index of store.indices.values()) result[index.name] = { mappings: index.mapping }
			return ok(result)
		}),
		route('GET', '/_all', () => {
			const result: Source = {}
			for (const index of store.indices.values()) result[index.name] = index.describe()
			return ok(result)
		}),

		route('HEAD', '/:index', (_request, path) => {
			const found = store.resolve(path.index)
			return ok(undefined, found.length > 0 || path.index.includes('*') ? 200 : 404)
		}),
		route('GET', '/:index', (_request, path) => {
			const result: Source = {}
			for (const index of store.resolve(path.index)) result[index.name] = index.describe()
			return ok(result)
		}),
		route('PUT', '/:index', (request, path) => {
			const body = optionalBody(request) ?? {}
			for (const key of Object.keys(body)) {
				if (!['settings', 'mappings', 'aliases'].includes(key))
					throw unsupported(`the "${key}" index creation option`)
			}
			if (isPlainObject(body.aliases) && Object.keys(body.aliases).length > 0) throw unsupported('index aliases')
			store.create(path.index, body.settings, body.mappings)
			return ok({ acknowledged: true, shards_acknowledged: true, index: path.index })
		}),
		route('DELETE', '/:index', (_request, path) => {
			store.delete(path.index)
			return ok({ acknowledged: true })
		}),
		route('GET', '/:index/_mapping', (_request, path) => {
			const result: Source = {}
			for (const index of store.resolve(path.index)) result[index.name] = { mappings: index.mapping }
			return ok(result)
		}),
		route('PUT,POST', '/:index/_mapping', (request, path) => {
			const body = requireBody(request)
			for (const index of store.resolve(path.index)) index.putMapping(body)
			return ok({ acknowledged: true })
		}),
		route('GET', '/:index/_settings', (_request, path) => {
			const result: Source = {}
			for (const index of store.resolve(path.index)) result[index.name] = { settings: index.describe().settings }
			return ok(result)
		}),

		route('POST', '/:index/_doc', (request, path) => putDocument(store, request, path.index, undefined, false)),
		route('PUT,POST', '/:index/_doc/:id', (request, path) =>
			putDocument(store, request, path.index, path.id, false)
		),
		route('PUT,POST', '/:index/_create/:id', (request, path) =>
			putDocument(store, request, path.index, path.id, true)
		),
		route('GET', '/:index/_doc/:id', (request, path) => {
			const index = store.get(path.index)
			const response = getResponse(index, path.id, sourceFilterFromParams(request.params))
			return ok(response, response.found ? 200 : 404)
		}),
		route('HEAD', '/:index/_doc/:id', (_request, path) => {
			const index = store.get(path.index)
			return ok(undefined, index.get(path.id) ? 200 : 404)
		}),
		route('GET', '/:index/_source/:id', (request, path) => {
			const index = store.get(path.index)
			const doc = index.get(path.id)
			if (!doc)
				throw new OpenSearchError(
					'resource_not_found_exception',
					404,
					`Document not found [${path.index}]/[${path.id}]`
				)
			return ok(applySourceFilter(doc.source, sourceFilterFromParams(request.params)) ?? {})
		}),
		route('HEAD', '/:index/_source/:id', (_request, path) => {
			const index = store.get(path.index)
			return ok(undefined, index.get(path.id) ? 200 : 404)
		}),
		route('DELETE', '/:index/_doc/:id', (_request, path) => {
			const index = store.get(path.index)
			const doc = index.delete(path.id)
			return ok(
				{
					_index: index.name,
					_id: path.id,
					_version: doc ? doc.version + 1 : 1,
					result: doc ? 'deleted' : 'not_found',
					_shards: SHARDS,
					_seq_no: doc?.seqNo ?? 0,
					_primary_term: 1,
				},
				doc ? 200 : 404
			)
		}),
		route('POST', '/:index/_update/:id', (request, path) => {
			const index = store.get(path.index)
			const body = requireBody(request)
			const result = index.update(path.id, body)
			const response: Source = writeResponse(index, result)
			const sourceParam = request.params.get('_source') ?? (body._source === true ? 'true' : undefined)
			if (sourceParam !== undefined && sourceParam !== 'false') {
				response.get = { _seq_no: result.doc.seqNo, _primary_term: 1, found: true, _source: result.doc.source }
			}
			return ok(response)
		}),
		route('POST', '/:index/_delete_by_query', (request, path) => {
			const started = Date.now()
			const deleted = deleteByQuery(store, path.index, optionalBody(request), request.params)
			return ok({
				took: Date.now() - started,
				timed_out: false,
				total: deleted,
				deleted,
				batches: deleted > 0 ? 1 : 0,
				version_conflicts: 0,
				noops: 0,
				retries: { bulk: 0, search: 0 },
				throttled_millis: 0,
				requests_per_second: -1,
				throttled_until_millis: 0,
				failures: [],
			})
		}),
	]
}

const matchRoute = (route: Route, request: Request): PathParams | undefined => {
	if (!route.methods.includes(request.method)) return undefined
	if (route.pattern.length !== request.segments.length) return undefined

	const params: Record<string, string> = {}
	for (let i = 0; i < route.pattern.length; i++) {
		const expected = route.pattern[i]!
		const actual = request.segments[i]!
		if (expected.startsWith(':')) {
			// Reserved names never bind to an index or id parameter.
			if (actual.startsWith('_') && expected !== ':id') return undefined
			params[expected.slice(1)] = actual
		} else if (expected !== actual) {
			return undefined
		}
	}
	return params as PathParams
}

export const dispatch = (routes: Route[], request: Request): Response => {
	let methodMismatch = false
	for (const route of routes) {
		const params = matchRoute(route, request)
		if (params) return route.handler(request, params)
		if (route.pattern.length === request.segments.length && !route.methods.includes(request.method)) {
			const probe = { ...request, method: route.methods[0]! }
			if (matchRoute(route, probe)) methodMismatch = true
		}
	}

	const path = `/${request.segments.join('/')}`
	if (methodMismatch) {
		return {
			status: 405,
			body: { error: `Incorrect HTTP method for uri [${path}] and method [${request.method}]`, status: 405 },
		}
	}
	throw unsupported(`the ${request.method} ${path} endpoint`)
}
