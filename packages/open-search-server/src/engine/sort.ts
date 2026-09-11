import { illegalArgument, queryShard, unsupported } from '../errors'
import { Doc, isNumericType, resolveField, ResolvedField, TextValue } from './mapping'
import { CompiledScript, compileScript, DocField } from './painless'
import { SearchContext } from './query'
import { isPlainObject } from './source'

export type SortSpec = {
	field: string
	order: 'asc' | 'desc'
	missing: '_first' | '_last' | unknown
	mode?: 'min' | 'max' | 'avg' | 'sum' | 'median'
	unmappedType?: string
	// A _script sort: the compiled expression & the declared result type.
	script?: { run: CompiledScript; type: 'number' | 'string'; params: Record<string, unknown> }
}

export type SortValue = number | string | boolean | null

export type Hit = { doc: Doc; score: number; sort: SortValue[] }

// The Long sentinels OpenSearch emits for missing values, as JSON parses them.
const LONG_MAX = 2 ** 63
const LONG_MIN = -(2 ** 63)

export const parseSort = (sort: unknown): SortSpec[] => {
	if (sort === undefined || sort === null) return []
	const list = Array.isArray(sort) ? sort : [sort]
	const specs: SortSpec[] = []

	for (const entry of list) {
		if (typeof entry === 'string') {
			const [field, order] = entry.split(':')
			specs.push(makeSpec(field!, { order }))
			continue
		}
		if (!isPlainObject(entry)) throw illegalArgument('sort entries must be strings or objects')

		for (const [field, options] of Object.entries(entry)) {
			if (field === '_script') {
				specs.push(makeScriptSpec(options))
				continue
			}
			if (field === '_geo_distance') throw unsupported('geo distance sorting')
			specs.push(makeSpec(field, isPlainObject(options) ? options : { order: options }))
		}
	}

	return specs
}

// { _script: { type, order, script: { source | inline, params, lang } } }
const makeScriptSpec = (options: unknown): SortSpec => {
	if (!isPlainObject(options)) throw illegalArgument('_script sort needs an object')

	for (const key of Object.keys(options)) {
		if (!['type', 'order', 'script', 'mode', 'nested'].includes(key)) {
			throw unsupported(`the "${key}" _script sort option`)
		}
	}
	if (options.nested !== undefined) throw unsupported('nested script sorting')
	if (options.mode !== undefined) throw unsupported('the "mode" _script sort option')

	const type = options.type === undefined ? undefined : String(options.type)
	if (type !== 'number' && type !== 'string') {
		throw illegalArgument(`_script sort needs a type of "number" or "string", got [${String(options.type)}]`)
	}

	const script = options.script
	if (!isPlainObject(script)) throw illegalArgument('_script sort needs a script object')
	if (script.lang !== undefined && script.lang !== 'painless') {
		throw unsupported(`the "${String(script.lang)}" script language`)
	}
	if (script.id !== undefined) throw unsupported('stored scripts')

	const source = script.source ?? script.inline
	if (typeof source !== 'string') throw illegalArgument('_script sort needs a script source')
	const params = isPlainObject(script.params) ? script.params : {}

	const spec = makeSpec('_script', { order: options.order })
	spec.script = { run: compileScript(source), type, params }
	return spec
}

const makeSpec = (field: string, options: Record<string, unknown>): SortSpec => {
	for (const key of Object.keys(options)) {
		if (
			![
				'order',
				'missing',
				'mode',
				'unmapped_type',
				'numeric_type',
				'format',
				'nested',
				'nested_path',
				'nested_filter',
			].includes(key)
		) {
			throw unsupported(`the "${key}" sort option`)
		}
	}
	if (options.nested !== undefined || options.nested_path !== undefined || options.nested_filter !== undefined) {
		throw unsupported('nested sorting')
	}

	const order =
		options.order === undefined ? (field === '_score' ? 'desc' : 'asc') : String(options.order).toLowerCase()
	if (order !== 'asc' && order !== 'desc') throw illegalArgument(`No value for order [${String(options.order)}]`)

	const mode = options.mode === undefined ? undefined : String(options.mode)
	if (mode !== undefined && !['min', 'max', 'avg', 'sum', 'median'].includes(mode)) {
		throw illegalArgument(`Unknown sort mode [${mode}]`)
	}

	return {
		field,
		order,
		missing: options.missing ?? '_last',
		mode: mode as SortSpec['mode'],
		unmappedType: options.unmapped_type === undefined ? undefined : String(options.unmapped_type),
	}
}

const TEXT_SORT_ERROR =
	'Text fields are not optimised for operations that require per-document field data like aggregations and sorting, so these operations are disabled by default. Please use a keyword field instead. Alternatively, set fielddata=true on [FIELD] in order to load field data by uninverting the inverted index. Note that this can use significant memory.'

export const requireSortableField = (
	ctx: SearchContext,
	name: string,
	unmappedType?: string
): ResolvedField | undefined => {
	const field = resolveField(ctx.index.mapping, name)
	if (!field) {
		if (unmappedType !== undefined) return undefined
		throw queryShard(`No mapping found for [${name}] in order to sort on`)
	}
	if (field.type === 'object' || field.type === 'nested') {
		throw illegalArgument(`Fielddata is not supported on field [${name}] of type [${field.type}]`)
	}
	if (field.type === 'text' && field.mapping.fielddata !== true) {
		throw illegalArgument(TEXT_SORT_ERROR.replace('FIELD', name))
	}
	return field
}

// Field values as sorting and aggregations see them: numbers, strings or
// booleans, with text tokens only when fielddata is enabled.
export const comparableValues = (
	doc: { fields: Map<string, unknown[]> },
	field: ResolvedField
): Array<number | string | boolean> => {
	const values = doc.fields.get(field.path) ?? []
	const out: Array<number | string | boolean> = []
	for (const value of values) {
		if (value instanceof TextValue) out.push(...value.tokens)
		else out.push(value as number | string | boolean)
	}
	return out
}

const reduce = (values: Array<number | string | boolean>, mode: SortSpec['mode'], order: 'asc' | 'desc'): SortValue => {
	if (values.length === 0) return null
	const numbers = values.map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
	const effective = mode ?? (order === 'asc' ? 'min' : 'max')

	if (typeof numbers[0] === 'string') {
		const strings = numbers.map(String).toSorted()
		if (effective === 'max') return strings[strings.length - 1]!
		if (effective === 'min') return strings[0]!
		throw illegalArgument(`Sort mode [${effective}] is not supported on string fields`)
	}

	const list = (numbers as number[]).toSorted((a, b) => a - b)
	switch (effective) {
		case 'min':
			return list[0]!
		case 'max':
			return list[list.length - 1]!
		case 'sum':
			return list.reduce((a, b) => a + b, 0)
		case 'avg':
			return list.reduce((a, b) => a + b, 0) / list.length
		case 'median': {
			const mid = Math.floor(list.length / 2)
			return list.length % 2 === 0 ? (list[mid - 1]! + list[mid]!) / 2 : list[mid]!
		}
	}
}

// doc['field'] inside a script reads the same values sorting does, so a
// text field without fielddata fails the same way.
const scriptFieldValues = (ctx: SearchContext, doc: Doc) => (name: string) => {
	const field = resolveField(ctx.index.mapping, name)
	if (!field) throw illegalArgument(`No field found for [${name}] in mapping`)
	if (field.type === 'object' || field.type === 'nested') {
		throw illegalArgument(`Fielddata is not supported on field [${name}] of type [${field.type}]`)
	}
	if (field.type === 'text' && field.mapping.fielddata !== true) {
		throw illegalArgument(TEXT_SORT_ERROR.replace('FIELD', name))
	}
	return comparableValues(doc, field)
}

const scriptSortValue = (ctx: SearchContext, doc: Doc, spec: SortSpec): SortValue => {
	const { run, type, params } = spec.script!
	const result = run({ field: scriptFieldValues(ctx, doc), params })

	if (result === null) return null
	if (result instanceof DocField) throw illegalArgument("A script sort must return a value, not doc['field']")
	if (Array.isArray(result) || typeof result === 'object') {
		throw illegalArgument('A script sort must return a number or string')
	}

	if (type === 'string') return String(result)
	if (typeof result === 'boolean') return result ? 1 : 0
	if (typeof result === 'string') {
		throw illegalArgument(`A script sort of type number returned the string [${result}]`)
	}
	return result
}

export const sortValueOf = (ctx: SearchContext, doc: Doc, score: number, spec: SortSpec): SortValue => {
	if (spec.field === '_score') return score
	if (spec.field === '_doc') return doc.order
	if (spec.script) return scriptSortValue(ctx, doc, spec)

	const field = requireSortableField(ctx, spec.field, spec.unmappedType)
	if (!field) return null

	const value = reduce(comparableValues(doc, field), spec.mode, spec.order)
	if (value !== null) return value

	if (spec.missing !== '_first' && spec.missing !== '_last') {
		const missing = spec.missing
		if (typeof missing === 'number' || typeof missing === 'string' || typeof missing === 'boolean') return missing
	}
	return null
}

// Missing values sort past everything, in whichever direction `missing` asks.
const compareValues = (a: SortValue, b: SortValue, spec: SortSpec): number => {
	if (a === null && b === null) return 0
	if (a === null) return spec.missing === '_first' ? -1 : 1
	if (b === null) return spec.missing === '_first' ? 1 : -1

	const direction = spec.order === 'asc' ? 1 : -1
	if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction
	const as = String(a)
	const bs = String(b)
	return (as < bs ? -1 : as > bs ? 1 : 0) * direction
}

export const compareHits = (a: Hit, b: Hit, specs: SortSpec[]): number => {
	for (let i = 0; i < specs.length; i++) {
		const result = compareValues(a.sort[i] ?? null, b.sort[i] ?? null, specs[i]!)
		if (result !== 0) return result
	}
	return 0
}

export const defaultCompare = (a: Hit, b: Hit): number => {
	if (a.score !== b.score) return b.score - a.score
	if (a.doc.index !== b.doc.index) return a.doc.index < b.doc.index ? -1 : 1
	return a.doc.order - b.doc.order
}

// A cursor value from a previous page: the Long sentinels and null all mean
// "missing" and compare the same way they sorted.
export const normalizeSearchAfter = (values: unknown, specs: SortSpec[]): SortValue[] => {
	if (!Array.isArray(values)) throw illegalArgument('search_after must be an array')
	if (specs.length === 0) throw illegalArgument('Sort must contain at least one field when using search_after')
	if (values.length !== specs.length) {
		throw illegalArgument(`search_after has ${values.length} value(s) but sort has ${specs.length}.`)
	}
	return values.map((value, i) => {
		const spec = specs[i]!
		if (value === null || value === undefined) return null
		if (typeof value === 'number') {
			if (spec.field !== '_score' && spec.field !== '_doc' && Math.abs(value) >= 9.2e18) return null
			return value
		}
		if (typeof value === 'string' || typeof value === 'boolean') return value
		throw illegalArgument(`Unsupported search_after value [${String(value)}]`)
	})
}

export const isAfter = (hit: Hit, cursor: SortValue[], specs: SortSpec[]): boolean => {
	for (let i = 0; i < specs.length; i++) {
		const result = compareValues(hit.sort[i] ?? null, cursor[i] ?? null, specs[i]!)
		if (result !== 0) return result > 0
	}
	return false
}

// Output shape: OpenSearch emits Long sentinels for missing numeric values
// and null for missing keywords.
export const renderSortValue = (ctx: SearchContext, value: SortValue, spec: SortSpec): SortValue => {
	if (value !== null) return typeof value === 'boolean' ? (value ? 1 : 0) : value
	if (spec.field === '_score' || spec.field === '_doc' || spec.script) return null

	const field = resolveField(ctx.index.mapping, spec.field)
	const numeric = field
		? isNumericType(field.type) || field.type === 'date' || field.type === 'boolean'
		: spec.unmappedType !== 'keyword'
	if (!numeric) return null

	const last = spec.missing !== '_first'
	return (spec.order === 'asc') === last ? LONG_MAX : LONG_MIN
}
