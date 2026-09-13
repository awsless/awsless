import { illegalArgument, parsingError, unsupported } from '../errors'
import {
	formatDate,
	Interval,
	nextInterval,
	parseCalendarInterval,
	parseDateFormat,
	parseDateMath,
	parseFixedInterval,
	roundToInterval,
} from './dates'
import { DocUnit, resolveField, ResolvedField } from './mapping'
import { compileQuery, Query, SearchContext } from './query'
import {
	comparableValues,
	compareHits,
	defaultCompare,
	Hit,
	parseSort,
	requireSortableField,
	sortValueOf,
	renderSortValue,
} from './sort'
import { applySourceFilter, isPlainObject, parseSourceFilter, Source } from './source'

export type AggContext = {
	contextFor: (index: string) => SearchContext
	scores: Map<DocUnit, number>
	allDocs: () => DocUnit[]
}

type Scalar = number | string | boolean

const METRIC_AGGS = ['min', 'max', 'sum', 'avg', 'value_count', 'cardinality', 'stats']
const BUCKET_AGGS = [
	'terms',
	'filter',
	'filters',
	'range',
	'date_range',
	'histogram',
	'date_histogram',
	'nested',
	'reverse_nested',
	'global',
	'top_hits',
]

const fieldOf = (agg: AggContext, unit: DocUnit, name: string): ResolvedField | undefined => {
	const ctx = agg.contextFor(unit.root.index)
	const field = resolveField(ctx.index.mapping, name)
	if (!field) return undefined
	requireSortableField(ctx, name, 'keyword')
	return field
}

const valuesOf = (agg: AggContext, unit: DocUnit, name: string): Scalar[] => {
	const field = fieldOf(agg, unit, name)
	return field ? comparableValues(unit, field) : []
}

const numbersOf = (agg: AggContext, unit: DocUnit, name: string, missing: unknown): number[] => {
	const values = valuesOf(agg, unit, name)
	if (values.length === 0) return missing === undefined ? [] : [Number(missing)]
	return values
		.map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'string' ? Number(v) : v))
		.filter(n => !Number.isNaN(n))
}

// Any unit of a bucket tells us the field type; dates get value_as_string.
const fieldTypeIn = (agg: AggContext, units: DocUnit[], name: string): ResolvedField['type'] | undefined => {
	for (const unit of units) {
		const field = fieldOf(agg, unit, name)
		if (field) return field.type
	}
	return undefined
}

const asObject = (value: unknown, what: string): Source => {
	if (!isPlainObject(value)) throw parsingError(`[${what}] must be an object`)
	return value
}

const rejectOptions = (options: Source, allowed: string[], type: string) => {
	for (const key of Object.keys(options)) {
		if (!allowed.includes(key)) throw unsupported(`the "${key}" option of the "${type}" aggregation`)
	}
}

const requireField = (options: Source, type: string): string => {
	if (options.script !== undefined) throw unsupported(`scripts in the "${type}" aggregation`)
	if (typeof options.field !== 'string') throw illegalArgument(`Required [field] for [${type}] aggregation`)
	return options.field
}

export const runAggregations = (agg: AggContext, spec: unknown, units: DocUnit[]): Record<string, unknown> => {
	const aggs = asObject(spec, 'aggregations')
	const result: Record<string, unknown> = {}

	for (const [name, definition] of Object.entries(aggs)) {
		const body = asObject(definition, name)
		const subAggs = body.aggs ?? body.aggregations
		const types = Object.keys(body).filter(key => key !== 'aggs' && key !== 'aggregations' && key !== 'meta')
		if (types.length !== 1)
			throw parsingError(`Found [${types.length}] aggregation types in [${name}], expected exactly one`)

		const type = types[0]!
		const options = asObject(body[type], type)

		if (METRIC_AGGS.includes(type)) {
			if (subAggs !== undefined)
				throw illegalArgument(`Aggregator [${name}] of type [${type}] cannot accept sub-aggregations`)
			result[name] = runMetric(agg, type, options, units)
		} else if (BUCKET_AGGS.includes(type)) {
			result[name] = runBucket(agg, type, options, units, subAggs)
		} else {
			throw unsupported(`the "${type}" aggregation`)
		}
	}

	return result
}

const withDate = (value: number | null, isDate: boolean) => {
	return isDate && value !== null ? { value, value_as_string: formatDate(value) } : { value }
}

const runMetric = (agg: AggContext, type: string, options: Source, units: DocUnit[]) => {
	rejectOptions(options, ['field', 'missing', 'script', 'format', 'precision_threshold'], type)
	const field = requireField(options, type)
	const isDate = fieldTypeIn(agg, units, field) === 'date'

	if (type === 'value_count') {
		let count = 0
		for (const unit of units) count += valuesOf(agg, unit, field).length || (options.missing === undefined ? 0 : 1)
		return { value: count }
	}

	if (type === 'cardinality') {
		const seen = new Set<Scalar>()
		for (const unit of units) {
			const values = valuesOf(agg, unit, field)
			if (values.length === 0 && options.missing !== undefined) seen.add(options.missing as Scalar)
			for (const value of values) seen.add(value)
		}
		return { value: seen.size }
	}

	const numbers: number[] = []
	for (const unit of units) numbers.push(...numbersOf(agg, unit, field, options.missing))

	const sum = numbers.reduce((a, b) => a + b, 0)
	const min = numbers.length ? Math.min(...numbers) : null
	const max = numbers.length ? Math.max(...numbers) : null
	const avg = numbers.length ? sum / numbers.length : null

	switch (type) {
		case 'min':
			return withDate(min, isDate)
		case 'max':
			return withDate(max, isDate)
		case 'sum':
			return withDate(sum, isDate)
		case 'avg':
			return withDate(avg, isDate)
		default:
			return isDate
				? {
						count: numbers.length,
						min,
						max,
						avg,
						sum,
						min_as_string: min === null ? null : formatDate(min),
						max_as_string: max === null ? null : formatDate(max),
						avg_as_string: avg === null ? null : formatDate(avg),
						sum_as_string: formatDate(sum),
					}
				: { count: numbers.length, min, max, avg, sum }
	}
}

const subResults = (agg: AggContext, subAggs: unknown, units: DocUnit[]) => {
	return subAggs === undefined ? {} : runAggregations(agg, subAggs, units)
}

const compileFilter = (agg: AggContext, query: unknown) => {
	const cache = new Map<string, Query>()
	return (unit: DocUnit) => {
		const index = unit.root.index
		let compiled = cache.get(index)
		if (!compiled) {
			compiled = compileQuery(agg.contextFor(index), query)
			cache.set(index, compiled)
		}
		return compiled.match(unit) !== undefined
	}
}

type Bucket = { key: Scalar; key_as_string?: string; doc_count: number; units: DocUnit[] }

const bucketKeyOf = (
	value: Scalar,
	type: ResolvedField['type'] | undefined
): { key: Scalar; key_as_string?: string } => {
	if (type === 'boolean') return { key: value ? 1 : 0, key_as_string: value ? 'true' : 'false' }
	if (type === 'date' && typeof value === 'number') return { key: value, key_as_string: formatDate(value) }
	return { key: value }
}

const readOrder = (order: unknown): Array<[string, 'asc' | 'desc']> => {
	if (order === undefined)
		return [
			['_count', 'desc'],
			['_key', 'asc'],
		]
	const list = Array.isArray(order) ? order : [order]
	const result: Array<[string, 'asc' | 'desc']> = []
	for (const entry of list) {
		for (const [key, direction] of Object.entries(asObject(entry, 'order'))) {
			const dir = String(direction).toLowerCase()
			if (dir !== 'asc' && dir !== 'desc') throw parsingError(`Unknown terms order direction [${dir}]`)
			result.push([key, dir])
		}
	}
	if (!result.some(([key]) => key === '_key')) result.push(['_key', 'asc'])
	return result
}

const orderValue = (bucket: Bucket, rendered: Record<string, unknown>, key: string): Scalar => {
	if (key === '_count') return bucket.doc_count
	if (key === '_key' || key === '_term') return bucket.key
	const [aggName, metric = 'value'] = key.split('.')
	const sub = rendered[aggName!]
	if (!isPlainObject(sub)) throw illegalArgument(`Invalid aggregation order path [${key}]`)
	const value = sub[metric]
	if (typeof value !== 'number')
		throw illegalArgument(
			`Invalid aggregation order path [${key}]. Buckets can only be sorted on a sub-aggregator path`
		)
	return value
}

const compareScalars = (a: Scalar, b: Scalar) => {
	if (typeof a === 'number' && typeof b === 'number') return a - b
	const as = String(a)
	const bs = String(b)
	return as < bs ? -1 : as > bs ? 1 : 0
}

const renderBuckets = (agg: AggContext, buckets: Bucket[], subAggs: unknown) => {
	return buckets.map(bucket => ({
		key: bucket.key,
		...(bucket.key_as_string !== undefined ? { key_as_string: bucket.key_as_string } : {}),
		doc_count: bucket.doc_count,
		...subResults(agg, subAggs, bucket.units),
	}))
}

const runTerms = (agg: AggContext, options: Source, units: DocUnit[], subAggs: unknown) => {
	rejectOptions(
		options,
		[
			'field',
			'size',
			'order',
			'min_doc_count',
			'missing',
			'include',
			'exclude',
			'shard_size',
			'show_term_doc_count_error',
			'script',
			'collect_mode',
			'execution_hint',
			'shard_min_doc_count',
		],
		'terms'
	)
	const field = requireField(options, 'terms')
	const size = Number(options.size ?? 10)
	const minDocCount = Number(options.min_doc_count ?? 1)
	const type = fieldTypeIn(agg, units, field)

	const include =
		options.include === undefined
			? undefined
			: Array.isArray(options.include)
				? new Set(options.include.map(String))
				: unsupportedInclude('include')
	const exclude =
		options.exclude === undefined
			? undefined
			: Array.isArray(options.exclude)
				? new Set(options.exclude.map(String))
				: unsupportedInclude('exclude')

	const groups = new Map<string, Bucket>()
	for (const unit of units) {
		let values = valuesOf(agg, unit, field)
		if (values.length === 0 && options.missing !== undefined) values = [options.missing as Scalar]
		const seen = new Set<string>()
		for (const value of values) {
			const id = `${typeof value}:${String(value)}`
			if (seen.has(id)) continue
			seen.add(id)
			if (include && !include.has(String(value))) continue
			if (exclude && exclude.has(String(value))) continue
			let bucket = groups.get(id)
			if (!bucket) {
				bucket = { ...bucketKeyOf(value, type), doc_count: 0, units: [] }
				groups.set(id, bucket)
			}
			bucket.doc_count++
			bucket.units.push(unit)
		}
	}

	const order = readOrder(options.order)
	const rendered = new Map<Bucket, Record<string, unknown>>()
	const needsSub = order.some(([key]) => key !== '_count' && key !== '_key' && key !== '_term')

	const all = [...groups.values()].filter(b => b.doc_count >= minDocCount)
	if (needsSub) for (const bucket of all) rendered.set(bucket, subResults(agg, subAggs, bucket.units))

	all.sort((a, b) => {
		for (const [key, direction] of order) {
			const result = compareScalars(
				orderValue(a, rendered.get(a) ?? {}, key),
				orderValue(b, rendered.get(b) ?? {}, key)
			)
			if (result !== 0) return direction === 'asc' ? result : -result
		}
		return 0
	})

	const top = all.slice(0, size)
	const other = all.slice(size).reduce((sum, b) => sum + b.doc_count, 0)

	return {
		doc_count_error_upper_bound: 0,
		sum_other_doc_count: other,
		buckets: renderBuckets(agg, top, subAggs),
	}
}

const unsupportedInclude = (what: string): never => {
	throw unsupported(`regular expressions or partitions in the terms "${what}" option (use an exact array)`)
}

const rangeBuckets = (agg: AggContext, options: Source, units: DocUnit[], subAggs: unknown, isDate: boolean) => {
	const field = requireField(options, isDate ? 'date_range' : 'range')
	const ranges = options.ranges
	if (!Array.isArray(ranges)) throw parsingError('[ranges] must be an array')
	const keyed = options.keyed === true

	const bound = (value: unknown, roundUp: boolean): number | undefined => {
		if (value === undefined || value === null) return undefined
		if (isDate) {
			if (typeof value === 'number') return value
			const format = options.format === undefined ? undefined : String(options.format)
			return parseDateMath(
				String(value),
				parseDateFormat(format),
				roundUp,
				agg.contextFor(units[0]?.root.index ?? '').now
			)
		}
		return Number(value)
	}

	const buckets = ranges.map(entry => {
		const range = asObject(entry, 'range')
		const from = bound(range.from, false)
		const to = bound(range.to, false)
		const label = (v: number | undefined) => (v === undefined ? '*' : isDate ? formatDate(v) : formatKey(v))
		const key = range.key === undefined ? `${label(from)}-${label(to)}` : String(range.key)
		const matched = units.filter(unit =>
			numbersOf(agg, unit, field, options.missing).some(
				v => (from === undefined || v >= from) && (to === undefined || v < to)
			)
		)
		return {
			key,
			...(from !== undefined ? { from, ...(isDate ? { from_as_string: formatDate(from) } : {}) } : {}),
			...(to !== undefined ? { to, ...(isDate ? { to_as_string: formatDate(to) } : {}) } : {}),
			doc_count: matched.length,
			...subResults(agg, subAggs, matched),
		}
	})

	if (keyed) {
		const result: Record<string, unknown> = {}
		for (const { key, ...rest } of buckets) result[key] = rest
		return { buckets: result }
	}
	return { buckets }
}

const formatKey = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value))

const histogramBuckets = (agg: AggContext, options: Source, units: DocUnit[], subAggs: unknown, isDate: boolean) => {
	const type = isDate ? 'date_histogram' : 'histogram'
	rejectOptions(
		options,
		[
			'field',
			'interval',
			'fixed_interval',
			'calendar_interval',
			'min_doc_count',
			'missing',
			'format',
			'extended_bounds',
			'hard_bounds',
			'offset',
			'order',
			'keyed',
			'time_zone',
			'script',
		],
		type
	)
	if (options.time_zone !== undefined) throw unsupported(`the "time_zone" option of the "${type}" aggregation`)
	if (options.order !== undefined) throw unsupported(`the "order" option of the "${type}" aggregation`)
	if (options.keyed !== undefined) throw unsupported(`the "keyed" option of the "${type}" aggregation`)
	if (options.offset !== undefined) throw unsupported(`the "offset" option of the "${type}" aggregation`)
	if (options.hard_bounds !== undefined) throw unsupported(`the "hard_bounds" option of the "${type}" aggregation`)

	const field = requireField(options, type)
	const minDocCount = Number(options.min_doc_count ?? 0)

	let interval: Interval
	if (isDate) {
		if (options.fixed_interval !== undefined)
			interval = { fixed: parseFixedInterval(String(options.fixed_interval)) }
		else if (options.calendar_interval !== undefined)
			interval = { calendar: parseCalendarInterval(String(options.calendar_interval)) }
		else if (options.interval !== undefined)
			throw unsupported(
				'the deprecated "interval" option of date_histogram (use fixed_interval or calendar_interval)'
			)
		else
			throw illegalArgument(
				'Required one of fields [interval, fixed_interval, calendar_interval], but none were specified.'
			)
	} else {
		const step = Number(options.interval)
		if (!(step > 0)) throw illegalArgument('[interval] must be 1 or greater for aggregation [histogram]')
		interval = { fixed: step }
	}

	const groups = new Map<number, Bucket>()
	for (const unit of units) {
		const seen = new Set<number>()
		for (const value of numbersOf(agg, unit, field, options.missing)) {
			const key = roundToInterval(value, interval)
			if (seen.has(key)) continue
			seen.add(key)
			let bucket = groups.get(key)
			if (!bucket) {
				bucket = { key, doc_count: 0, units: [] }
				groups.set(key, bucket)
			}
			bucket.doc_count++
			bucket.units.push(unit)
		}
	}

	const keys = [...groups.keys()].toSorted((a, b) => a - b)
	let buckets: Bucket[]

	if (minDocCount === 0 && keys.length > 0) {
		let min = keys[0]!
		let max = keys[keys.length - 1]!
		if (isPlainObject(options.extended_bounds)) {
			const bounds = options.extended_bounds
			if (bounds.min !== undefined) min = Math.min(min, roundToInterval(Number(bounds.min), interval))
			if (bounds.max !== undefined) max = Math.max(max, roundToInterval(Number(bounds.max), interval))
		}
		buckets = []
		for (let key = min; key <= max; key = nextInterval(key, interval)) {
			buckets.push(groups.get(key) ?? { key, doc_count: 0, units: [] })
		}
	} else {
		buckets = keys.map(key => groups.get(key)!).filter(b => b.doc_count >= minDocCount)
	}

	return {
		buckets: buckets.map(bucket => ({
			...(isDate ? { key_as_string: formatDate(bucket.key as number) } : {}),
			key: bucket.key,
			doc_count: bucket.doc_count,
			...subResults(agg, subAggs, bucket.units),
		})),
	}
}

const renderTopHit = (
	agg: AggContext,
	hit: Hit,
	specs: ReturnType<typeof parseSort>,
	source: ReturnType<typeof parseSourceFilter>
) => {
	const ctx = agg.contextFor(hit.doc.index)
	const filtered = applySourceFilter(hit.doc.source, source)
	return {
		_index: hit.doc.index,
		_id: hit.doc.id,
		_score: specs.length === 0 || specs.some(s => s.field === '_score') ? hit.score : null,
		...(filtered !== undefined ? { _source: filtered } : {}),
		...(specs.length > 0 ? { sort: hit.sort.map((v, i) => renderSortValue(ctx, v, specs[i]!)) } : {}),
	}
}

const runTopHits = (agg: AggContext, options: Source, units: DocUnit[]) => {
	rejectOptions(
		options,
		['size', 'from', 'sort', '_source', 'version', 'seq_no_primary_term', 'explain', 'track_scores'],
		'top_hits'
	)
	const size = Number(options.size ?? 3)
	const from = Number(options.from ?? 0)
	const specs = parseSort(options.sort)
	const source = parseSourceFilter(options._source)

	const hits: Hit[] = units.map(unit => {
		const doc = unit.root
		const score = agg.scores.get(unit) ?? agg.scores.get(doc) ?? 1
		const ctx = agg.contextFor(doc.index)
		return { doc, score, sort: specs.map(spec => sortValueOf(ctx, doc, score, spec)) }
	})
	hits.sort((a, b) => (specs.length > 0 ? compareHits(a, b, specs) : defaultCompare(a, b)))

	const page = hits.slice(from, from + size)
	const maxScore = specs.length === 0 && page.length > 0 ? Math.max(...page.map(h => h.score)) : null

	return {
		hits: {
			total: { value: hits.length, relation: 'eq' },
			max_score: maxScore,
			hits: page.map(hit => renderTopHit(agg, hit, specs, source)),
		},
	}
}

const runBucket = (agg: AggContext, type: string, options: Source, units: DocUnit[], subAggs: unknown): unknown => {
	switch (type) {
		case 'terms':
			return runTerms(agg, options, units, subAggs)
		case 'filter': {
			const matches = compileFilter(agg, options)
			const matched = units.filter(matches)
			return { doc_count: matched.length, ...subResults(agg, subAggs, matched) }
		}
		case 'filters': {
			rejectOptions(options, ['filters', 'other_bucket', 'other_bucket_key'], type)
			const filters = options.filters
			const otherKey = options.other_bucket_key === undefined ? '_other_' : String(options.other_bucket_key)
			const wantOther = options.other_bucket === true || options.other_bucket_key !== undefined
			if (Array.isArray(filters)) {
				const buckets = filters.map(f => {
					const matched = units.filter(compileFilter(agg, f))
					return { doc_count: matched.length, ...subResults(agg, subAggs, matched) }
				})
				if (wantOther) {
					const matchers = filters.map(f => compileFilter(agg, f))
					const other = units.filter(u => !matchers.some(m => m(u)))
					buckets.push({ doc_count: other.length, ...subResults(agg, subAggs, other) })
				}
				return { buckets }
			}
			const named = asObject(filters, 'filters')
			const buckets: Record<string, unknown> = {}
			const matchers = Object.entries(named).map(([key, f]) => [key, compileFilter(agg, f)] as const)
			for (const [key, matches] of matchers) {
				const matched = units.filter(matches)
				buckets[key] = { doc_count: matched.length, ...subResults(agg, subAggs, matched) }
			}
			if (wantOther) {
				const other = units.filter(u => !matchers.some(([, m]) => m(u)))
				buckets[otherKey] = { doc_count: other.length, ...subResults(agg, subAggs, other) }
			}
			return { buckets }
		}
		case 'range':
			rejectOptions(options, ['field', 'ranges', 'keyed', 'missing', 'script'], type)
			return rangeBuckets(agg, options, units, subAggs, false)
		case 'date_range':
			rejectOptions(options, ['field', 'ranges', 'keyed', 'missing', 'format', 'time_zone', 'script'], type)
			if (options.time_zone !== undefined)
				throw unsupported('the "time_zone" option of the "date_range" aggregation')
			return rangeBuckets(agg, options, units, subAggs, true)
		case 'histogram':
			return histogramBuckets(agg, options, units, subAggs, false)
		case 'date_histogram':
			return histogramBuckets(agg, options, units, subAggs, true)
		case 'nested': {
			rejectOptions(options, ['path'], type)
			if (typeof options.path !== 'string') throw parsingError('[nested] aggregation requires a path')
			const path = options.path
			const nestedUnits: DocUnit[] = []
			for (const unit of units) {
				const ctx = agg.contextFor(unit.root.index)
				const field = resolveField(ctx.index.mapping, path)
				if (field && field.type !== 'nested')
					throw illegalArgument(`[nested] nested object under path [${path}] is not of nested type`)
				nestedUnits.push(...(unit.nested.get(path) ?? []))
			}
			return { doc_count: nestedUnits.length, ...subResults(agg, subAggs, nestedUnits) }
		}
		case 'reverse_nested': {
			rejectOptions(options, ['path'], type)
			if (options.path !== undefined) throw unsupported('the "path" option of the "reverse_nested" aggregation')
			const roots: DocUnit[] = []
			const seen = new Set<DocUnit>()
			for (const unit of units) {
				if (seen.has(unit.root)) continue
				seen.add(unit.root)
				roots.push(unit.root)
			}
			return { doc_count: roots.length, ...subResults(agg, subAggs, roots) }
		}
		case 'global': {
			rejectOptions(options, [], type)
			const all = agg.allDocs()
			return { doc_count: all.length, ...subResults(agg, subAggs, all) }
		}
		case 'top_hits':
			if (subAggs !== undefined) throw illegalArgument('Aggregator [top_hits] cannot accept sub-aggregations')
			return runTopHits(agg, options, units)
		default:
			throw unsupported(`the "${type}" aggregation`)
	}
}
