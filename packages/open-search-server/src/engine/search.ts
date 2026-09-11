import { illegalArgument, unsupported, wrapSearchError } from '../errors'
import { AggContext, runAggregations } from './aggs'
import { Doc, DocUnit } from './mapping'
import { compileQuery, createContext, Query, SearchContext } from './query'
import {
	compareHits,
	defaultCompare,
	Hit,
	isAfter,
	normalizeSearchAfter,
	parseSort,
	renderSortValue,
	sortValueOf,
	SortSpec,
} from './sort'
import { applySourceFilter, isPlainObject, parseSourceFilter, Source } from './source'
import { Index, Store } from './store'

const SEARCH_BODY_KEYS = new Set([
	'query',
	'from',
	'size',
	'sort',
	'search_after',
	'track_total_hits',
	'track_scores',
	'_source',
	'aggs',
	'aggregations',
	'min_score',
	'explain',
	'timeout',
	'version',
	'seq_no_primary_term',
	'stored_fields',
	'profile',
	'terminate_after',
])

const SEARCH_PARAMS = new Set([
	'size',
	'from',
	'q',
	'track_total_hits',
	'default_operator',
	'df',
	'analyzer',
	'analyze_wildcard',
	'lenient',
	'timeout',
	'pretty',
	'human',
	'error_trace',
	'filter_path',
	'routing',
	'preference',
	'ignore_unavailable',
	'allow_no_indices',
	'expand_wildcards',
	'rest_total_hits_as_int',
	'typed_keys',
	'search_type',
	'request_cache',
	'allow_partial_search_results',
	'batched_reduce_size',
	'max_concurrent_shard_requests',
	'ccs_minimize_roundtrips',
	'seq_no_primary_term',
	'version',
	'_source',
	'sort',
	'explain',
	'track_scores',
	'terminate_after',
	'scroll',
	'stored_fields',
	'min_score',
])

export type SearchRequest = {
	indices: string | undefined
	body: Source
	params: URLSearchParams
}

type Matched = { index: Index; ctx: SearchContext; hits: Hit[] }

const readBoolean = (value: unknown, what: string): boolean | undefined => {
	if (value === undefined) return undefined
	if (value === true || value === 'true') return true
	if (value === false || value === 'false') return false
	throw illegalArgument(
		`Failed to parse value [${String(value)}] as only [true] or [false] are allowed for [${what}]`
	)
}

const readInteger = (value: unknown, what: string): number | undefined => {
	if (value === undefined || value === null) return undefined
	const number = typeof value === 'number' ? value : Number(value)
	if (!Number.isInteger(number)) throw illegalArgument(`[${what}] must be an integer`)
	return number
}

// The `q` param is a query_string over the default fields, like the REST API.
const queryFromParams = (params: URLSearchParams): Source | undefined => {
	const q = params.get('q')
	if (q === null) return undefined
	const options: Source = { query: q }
	if (params.has('df')) options.default_field = params.get('df')
	if (params.has('default_operator')) options.default_operator = params.get('default_operator')
	if (params.has('analyzer')) options.analyzer = params.get('analyzer')
	if (params.has('analyze_wildcard')) options.analyze_wildcard = params.get('analyze_wildcard') === 'true'
	if (params.has('lenient')) options.lenient = params.get('lenient') === 'true'
	return { query_string: options }
}

const validateParams = (params: URLSearchParams) => {
	for (const key of params.keys()) {
		if (!SEARCH_PARAMS.has(key)) throw unsupported(`the "${key}" search parameter`)
	}
	if (params.has('scroll')) throw unsupported('scroll searches')
	if (params.has('rest_total_hits_as_int') && params.get('rest_total_hits_as_int') === 'true') {
		throw unsupported('the "rest_total_hits_as_int" search parameter')
	}
}

const resolveQuery = (body: Source, params: URLSearchParams): unknown => {
	const fromParams = queryFromParams(params)
	if (fromParams && body.query !== undefined)
		throw illegalArgument('Cannot combine the q parameter with a request body query')
	return fromParams ?? body.query
}

export const collectMatches = (index: Index, query: unknown, now: number): Matched => {
	const ctx = createContext(index, now)
	let compiled: Query
	try {
		compiled = compileQuery(ctx, query)
	} catch (error) {
		throw wrapSearchError(error, index.name)
	}

	const hits: Hit[] = []
	for (const doc of index.docs.values()) {
		const score = compiled.match(doc)
		if (score !== undefined) hits.push({ doc, score, sort: [] })
	}
	return { index, ctx, hits }
}

export const countDocuments = (
	store: Store,
	indices: string | undefined,
	body: Source | undefined,
	params: URLSearchParams
): number => {
	const query = resolveQuery(body ?? {}, params)
	let count = 0
	const now = Date.now()
	for (const index of store.resolve(indices)) count += collectMatches(index, query, now).hits.length
	return count
}

export const deleteByQuery = (
	store: Store,
	indices: string,
	body: Source | undefined,
	params: URLSearchParams
): number => {
	const query = resolveQuery(body ?? {}, params)
	if (query === undefined) throw illegalArgument('query is missing')
	let deleted = 0
	const now = Date.now()
	for (const index of store.resolve(indices)) {
		for (const hit of collectMatches(index, query, now).hits) {
			index.delete(hit.doc.id)
			deleted++
		}
	}
	return deleted
}

export const search = (store: Store, request: SearchRequest): Source => {
	const started = Date.now()
	const { body, params } = request
	validateParams(params)

	for (const key of Object.keys(body)) {
		if (!SEARCH_BODY_KEYS.has(key)) throw unsupported(`the "${key}" search body option`)
	}
	if (body.explain === true) throw unsupported('explain: true')
	if (body.profile === true) throw unsupported('profile: true')
	if (body.terminate_after !== undefined) throw unsupported('terminate_after')
	if (body.stored_fields !== undefined && body.stored_fields !== '_none_' && body.stored_fields !== '_source') {
		throw unsupported('stored_fields other than "_none_"')
	}

	const from = readInteger(body.from ?? params.get('from') ?? undefined, 'from') ?? 0
	const size = readInteger(body.size ?? params.get('size') ?? undefined, 'size') ?? 10
	if (from < 0) throw illegalArgument('[from] parameter cannot be negative')
	if (size < 0) throw illegalArgument('[size] parameter cannot be negative')

	const trackTotalHits = body.track_total_hits ?? params.get('track_total_hits') ?? undefined
	const trackScores =
		readBoolean(body.track_scores ?? params.get('track_scores') ?? undefined, 'track_scores') ?? false
	const includeVersion = readBoolean(body.version ?? params.get('version') ?? undefined, 'version') ?? false
	const includeSeqNo =
		readBoolean(
			body.seq_no_primary_term ?? params.get('seq_no_primary_term') ?? undefined,
			'seq_no_primary_term'
		) ?? false
	const minScore = body.min_score === undefined ? undefined : Number(body.min_score)
	const sourceFilter =
		body.stored_fields === '_none_' ? false : parseSourceFilter(body._source ?? params.get('_source') ?? undefined)

	const query = resolveQuery(body, params)
	const specs = parseSort(body.sort ?? (params.has('sort') ? params.get('sort')!.split(',') : undefined))
	const searchAfter = body.search_after === undefined ? undefined : normalizeSearchAfter(body.search_after, specs)

	const indices = store.resolve(request.indices)
	const now = started
	const matches: Matched[] = []

	for (const index of indices) {
		const matched = collectMatches(index, query, now)
		if (minScore !== undefined) matched.hits = matched.hits.filter(hit => hit.score >= minScore)
		try {
			for (const hit of matched.hits)
				hit.sort = specs.map(spec => sortValueOf(matched.ctx, hit.doc, hit.score, spec))
		} catch (error) {
			throw wrapSearchError(error, index.name)
		}
		matches.push(matched)
	}

	const contexts = new Map(matches.map(m => [m.index.name, m.ctx]))
	let hits = matches.flatMap(m => m.hits)
	hits.sort((a, b) => (specs.length > 0 ? compareHits(a, b, specs) : defaultCompare(a, b)))

	// Aggregations see every match, before search_after and paging.
	const aggregations = runAggs(body.aggs ?? body.aggregations, hits, contexts, indices)

	if (searchAfter) hits = hits.filter(hit => isAfter(hit, searchAfter, specs))

	const total = hits.length
	const page = hits.slice(from, from + size)
	const scored = specs.length === 0 || specs.some(s => s.field === '_score') || trackScores
	const maxScore = scored && page.length > 0 ? Math.max(...page.map(h => h.score)) : null

	const response: Source = {
		took: Date.now() - started,
		timed_out: false,
		_shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
		hits: {
			...renderTotal(total, trackTotalHits),
			max_score: maxScore,
			hits: page.map(hit =>
				renderHit(hit, contexts.get(hit.doc.index)!, specs, scored, sourceFilter, includeVersion, includeSeqNo)
			),
		},
	}
	if (aggregations) response.aggregations = aggregations
	return response
}

const renderTotal = (total: number, track: unknown) => {
	if (track === false || track === 'false') return {}
	if (track === undefined || track === true || track === 'true') return { total: { value: total, relation: 'eq' } }
	const limit = Number(track)
	if (!Number.isInteger(limit))
		throw illegalArgument(`[track_total_hits] must be a boolean or an integer, got [${String(track)}]`)
	return total <= limit ? { total: { value: total, relation: 'eq' } } : { total: { value: limit, relation: 'gte' } }
}

const renderHit = (
	hit: Hit,
	ctx: SearchContext,
	specs: SortSpec[],
	scored: boolean,
	sourceFilter: ReturnType<typeof parseSourceFilter>,
	includeVersion: boolean,
	includeSeqNo: boolean
): Source => {
	const source = applySourceFilter(hit.doc.source, sourceFilter)
	const rendered: Source = {
		_index: hit.doc.index,
		_id: hit.doc.id,
		_score: scored ? hit.score : null,
	}
	if (includeVersion) rendered._version = hit.doc.version
	if (includeSeqNo) {
		rendered._seq_no = hit.doc.seqNo
		rendered._primary_term = 1
	}
	if (source !== undefined) rendered._source = source
	if (specs.length > 0) rendered.sort = hit.sort.map((value, i) => renderSortValue(ctx, value, specs[i]!))
	return rendered
}

const runAggs = (spec: unknown, hits: Hit[], contexts: Map<string, SearchContext>, indices: Index[]) => {
	if (spec === undefined) return undefined
	if (!isPlainObject(spec)) throw illegalArgument('aggregations must be an object')
	if (Object.keys(spec).length === 0) return undefined

	const scores = new Map<DocUnit, number>()
	for (const hit of hits) scores.set(hit.doc, hit.score)

	const agg: AggContext = {
		contextFor: name => contexts.get(name)!,
		scores,
		allDocs: () => indices.flatMap(index => [...index.docs.values()] as Doc[]),
	}

	try {
		return runAggregations(
			agg,
			spec,
			hits.map(h => h.doc)
		)
	} catch (error) {
		throw wrapSearchError(error, indices[0]?.name ?? '_all')
	}
}
