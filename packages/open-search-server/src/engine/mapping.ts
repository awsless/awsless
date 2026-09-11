import { illegalArgument, mapperParsing, strictDynamic, unsupported } from '../errors'
import { Analyzer, AnalysisRegistry } from './analysis'
import { DateFormat, isIsoDate, parseDateFormat, parseDateValue } from './dates'
import { isPlainObject, Source } from './source'

export type FieldMapping = Record<string, unknown> & {
	type?: string
	properties?: Record<string, FieldMapping>
	fields?: Record<string, FieldMapping>
	dynamic?: boolean | string
}

export type RootMapping = FieldMapping

export type LeafType =
	| 'keyword'
	| 'text'
	| 'long'
	| 'integer'
	| 'short'
	| 'byte'
	| 'double'
	| 'float'
	| 'half_float'
	| 'scaled_float'
	| 'boolean'
	| 'date'
	| 'ip'

export type FieldType = LeafType | 'object' | 'nested'

const INTEGER_TYPES = new Set(['long', 'integer', 'short', 'byte'])
const FLOAT_TYPES = new Set(['double', 'float', 'half_float', 'scaled_float'])
const LEAF_TYPES = new Set<string>(['keyword', 'text', 'boolean', 'date', 'ip', ...INTEGER_TYPES, ...FLOAT_TYPES])

export const isNumericType = (type: FieldType) => INTEGER_TYPES.has(type) || FLOAT_TYPES.has(type)

// Options that change nothing about matching in a single-node mock.
const HARMLESS_OPTIONS = new Set([
	'index',
	'doc_values',
	'store',
	'norms',
	'similarity',
	'eager_global_ordinals',
	'boost',
	'coerce',
	'ignore_malformed',
	'scaling_factor',
	'fielddata',
	'index_options',
	'position_increment_gap',
	'term_vector',
	'meta',
	'split_queries_on_whitespace',
	'index_phrases',
	'index_prefixes',
	'enabled',
	'include_in_parent',
	'include_in_root',
])

const KNOWN_OPTIONS = new Set([
	...HARMLESS_OPTIONS,
	'type',
	'fields',
	'properties',
	'dynamic',
	'analyzer',
	'search_analyzer',
	'normalizer',
	'format',
	'ignore_above',
	'null_value',
	'copy_to',
])

export type MappingHost = { mapping: RootMapping; analysis: AnalysisRegistry }

export class TextValue {
	constructor(readonly tokens: string[]) {}
}

export type FieldValue = string | number | boolean | TextValue

export type DocUnit = {
	fields: Map<string, FieldValue[]>
	nested: Map<string, DocUnit[]>
	source: Source
	root: Doc
}

export type Doc = DocUnit & {
	index: string
	id: string
	version: number
	seqNo: number
	order: number
}

export type ResolvedField = {
	path: string
	type: FieldType
	mapping: FieldMapping
	nestedPath?: string
}

const fieldTypeOf = (mapping: FieldMapping): FieldType => {
	const type = mapping.type
	if (type === undefined) return 'object'
	if (type === 'object' || type === 'nested') return type
	if (LEAF_TYPES.has(type)) return type as LeafType
	throw unsupported(`the "${type}" field type`)
}

const parseDynamic = (value: unknown, path: string): boolean | 'strict' | undefined => {
	if (value === undefined) return undefined
	if (value === true || value === 'true') return true
	if (value === false || value === 'false') return false
	if (value === 'strict') return 'strict'
	if (value === 'runtime') throw unsupported('dynamic: "runtime" mappings')
	throw mapperParsing(`Failed to parse mapping [_doc]: Failed to parse [dynamic] on [${path}]: ${String(value)}`)
}

// Rejects everything the engine cannot honour at mapping time, so a field
// never quietly behaves differently from a real cluster.
const validateField = (name: string, mapping: unknown, analysis: AnalysisRegistry, path: string): FieldMapping => {
	if (!isPlainObject(mapping)) {
		throw mapperParsing(
			`Failed to parse mapping [_doc]: Expected map for property [fields] on field [${name}] but got a ${typeof mapping}`
		)
	}

	const field = mapping as FieldMapping
	const type = fieldTypeOf(field)

	for (const key of Object.keys(field)) {
		if (!KNOWN_OPTIONS.has(key)) {
			if (key === 'dynamic_templates') throw unsupported('dynamic_templates')
			throw mapperParsing(`unknown parameter [${key}] on mapper [${name}] of type [${type}]`)
		}
	}

	if (type === 'object' || type === 'nested') {
		parseDynamic(field.dynamic, path)
		if (field.properties !== undefined) {
			if (!isPlainObject(field.properties)) {
				throw mapperParsing(
					`Failed to parse mapping [_doc]: Expected map for property [properties] on field [${name}]`
				)
			}
			field.properties = validateProperties(field.properties, analysis, path)
		}
		if (field.fields !== undefined || field.analyzer !== undefined || field.format !== undefined) {
			throw mapperParsing(
				`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters`
			)
		}
		return field
	}

	if (field.properties !== undefined || field.dynamic !== undefined) {
		throw mapperParsing(
			`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [properties]`
		)
	}

	if (field.analyzer !== undefined || field.search_analyzer !== undefined) {
		if (type !== 'text') {
			throw mapperParsing(
				`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [analyzer]`
			)
		}
		for (const analyzer of [field.analyzer, field.search_analyzer]) {
			if (analyzer !== undefined && !analysis.hasAnalyzer(String(analyzer))) {
				if (['standard', 'simple', 'whitespace', 'keyword', 'english'].includes(String(analyzer))) continue
				throw unsupported(`the "${String(analyzer)}" analyzer`)
			}
		}
	}

	if (field.normalizer !== undefined) {
		if (type !== 'keyword') {
			throw mapperParsing(
				`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [normalizer]`
			)
		}
		if (!analysis.hasNormalizer(String(field.normalizer))) {
			if (String(field.normalizer) !== 'lowercase') {
				throw unsupported(`the "${String(field.normalizer)}" normalizer`)
			}
		}
	}

	if (field.format !== undefined) {
		if (type !== 'date') {
			throw mapperParsing(
				`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [format]`
			)
		}
		parseDateFormat(String(field.format))
	}

	if (field.fields !== undefined) {
		if (!isPlainObject(field.fields)) {
			throw mapperParsing(`Failed to parse mapping [_doc]: Expected map for property [fields] on field [${name}]`)
		}
		const fields: Record<string, FieldMapping> = {}
		for (const [subName, subMapping] of Object.entries(field.fields)) {
			const sub = validateField(subName, subMapping, analysis, `${path}.${subName}`)
			if (sub.type === undefined || sub.type === 'object' || sub.type === 'nested' || sub.fields !== undefined) {
				throw mapperParsing(
					`Failed to parse mapping [_doc]: Field [${subName}] cannot be a multi-field of type [${sub.type ?? 'object'}]`
				)
			}
			fields[subName] = sub
		}
		field.fields = fields
	}

	return field
}

const validateProperties = (
	properties: Source,
	analysis: AnalysisRegistry,
	path: string
): Record<string, FieldMapping> => {
	const result: Record<string, FieldMapping> = {}
	for (const [name, mapping] of Object.entries(properties)) {
		if (name.includes('.')) throw unsupported('dotted field names in mappings')
		result[name] = validateField(name, mapping, analysis, path ? `${path}.${name}` : name)
	}
	return result
}

export const validateRootMapping = (mapping: unknown, analysis: AnalysisRegistry): RootMapping => {
	if (mapping === undefined) return { properties: {} }
	if (!isPlainObject(mapping)) throw mapperParsing('Failed to parse mapping [_doc]: mappings must be an object')

	const root: RootMapping = {}
	for (const [key, value] of Object.entries(mapping)) {
		if (key === 'properties') {
			if (!isPlainObject(value))
				throw mapperParsing('Failed to parse mapping [_doc]: properties must be an object')
			root.properties = validateProperties(value, analysis, '')
		} else if (key === 'dynamic') {
			root.dynamic = parseDynamic(value, '_doc')
		} else if (key === '_meta') {
			root._meta = value
		} else if (key === 'date_detection' || key === 'numeric_detection') {
			root[key] = value === true || value === 'true'
		} else if (key === '_source' || key === '_routing') {
			const enabled = isPlainObject(value) ? value.enabled : undefined
			if (enabled === false) throw unsupported(`disabling ${key}`)
		} else if (key === 'dynamic_templates') {
			throw unsupported('dynamic_templates')
		} else if (key === '_doc') {
			throw mapperParsing(
				'Failed to parse mapping [_doc]: Root mapping definition has unsupported parameters: [_doc]'
			)
		} else {
			throw unsupported(`the "${key}" root mapping setting`)
		}
	}

	root.properties ??= {}
	return root
}

const mergeField = (name: string, existing: FieldMapping, incoming: FieldMapping): FieldMapping => {
	const existingType = fieldTypeOf(existing)
	const incomingType = fieldTypeOf(incoming)

	if (existingType !== incomingType) {
		throw illegalArgument(`mapper [${name}] cannot be changed from type [${existingType}] to [${incomingType}]`)
	}

	const merged: FieldMapping = { ...existing, ...incoming }

	if (existing.properties || incoming.properties) {
		merged.properties = mergeProperties(existing.properties ?? {}, incoming.properties ?? {})
	}

	if (existing.fields || incoming.fields) {
		merged.fields = mergeProperties(existing.fields ?? {}, incoming.fields ?? {})
	}

	return merged
}

const mergeProperties = (existing: Record<string, FieldMapping>, incoming: Record<string, FieldMapping>) => {
	const result = { ...existing }
	for (const [name, mapping] of Object.entries(incoming)) {
		const current = result[name]
		result[name] = current ? mergeField(name, current, mapping) : mapping
	}
	return result
}

export const mergeRootMapping = (existing: RootMapping, incoming: RootMapping): RootMapping => {
	return {
		...existing,
		...incoming,
		properties: mergeProperties(existing.properties ?? {}, incoming.properties ?? {}),
	}
}

export const resolveField = (root: RootMapping, path: string): ResolvedField | undefined => {
	const segments = path.split('.')
	let node: FieldMapping = root
	let nestedPath: string | undefined

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i]!
		const last = i === segments.length - 1
		const child = node.properties?.[segment]

		if (child) {
			node = child
			if (fieldTypeOf(child) === 'nested') nestedPath = segments.slice(0, i + 1).join('.')
			continue
		}

		// The remaining segment may name a multi-field of the current leaf.
		if (last && node !== root && node.fields?.[segment]) {
			node = node.fields[segment]
			continue
		}

		return undefined
	}

	return { path, type: fieldTypeOf(node), mapping: node, nestedPath }
}

// All leaf fields (multi-fields included) below the root, skipping nested
// subtrees since those only match inside a nested query.
export const listLeafFields = (root: RootMapping): ResolvedField[] => {
	const result: ResolvedField[] = []

	const walk = (node: FieldMapping, path: string) => {
		for (const [name, child] of Object.entries(node.properties ?? {})) {
			const childPath = path ? `${path}.${name}` : name
			const type = fieldTypeOf(child)
			if (type === 'nested') continue
			if (type === 'object') {
				walk(child, childPath)
				continue
			}
			result.push({ path: childPath, type, mapping: child })
			for (const [subName, sub] of Object.entries(child.fields ?? {})) {
				result.push({ path: `${childPath}.${subName}`, type: fieldTypeOf(sub), mapping: sub })
			}
		}
	}

	walk(root, '')
	return result
}

export const matchFieldPattern = (pattern: string, fields: ResolvedField[]): ResolvedField[] => {
	if (!pattern.includes('*')) {
		return fields.filter(f => f.path === pattern)
	}
	const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
	return fields.filter(f => regex.test(f.path))
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const dateFormatOf = (field: ResolvedField): DateFormat => {
	return parseDateFormat(field.mapping.format === undefined ? undefined : String(field.mapping.format))
}

export const indexAnalyzerOf = (host: MappingHost, field: ResolvedField): Analyzer => {
	return host.analysis.analyzer(String(field.mapping.analyzer ?? 'standard'))
}

export const searchAnalyzerOf = (host: MappingHost, field: ResolvedField): Analyzer => {
	return host.analysis.analyzer(String(field.mapping.search_analyzer ?? field.mapping.analyzer ?? 'standard'))
}

export const normalizeKeyword = (host: MappingHost, field: ResolvedField, value: string): string => {
	const normalizer = field.mapping.normalizer
	if (normalizer === undefined) return value
	if (!host.analysis.hasNormalizer(String(normalizer)) && normalizer === 'lowercase') return value.toLowerCase()
	return host.analysis.normalizer(String(normalizer))(value)
}

const preview = (value: unknown) => {
	const text = typeof value === 'string' ? value : JSON.stringify(value)
	return text.length > 40 ? `${text.slice(0, 37)}...` : text
}

const parseFailure = (path: string, type: string, value: unknown) => {
	return mapperParsing(
		`failed to parse field [${path}] of type [${type}] in document. Preview of field's value: '${preview(value)}'`
	)
}

const IP_PATTERN = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:]+)$/

// Turns one raw JSON value into what the field stores, coercing the way
// OpenSearch does by default (numeric strings, "true"/"false").
export const coerceLeafValue = (host: MappingHost, field: ResolvedField, value: unknown): FieldValue | undefined => {
	const { type, path } = field

	if (value === null || value === undefined) {
		const nullValue = field.mapping.null_value
		return nullValue === undefined || nullValue === null ? undefined : coerceLeafValue(host, field, nullValue)
	}

	if (isPlainObject(value)) {
		throw mapperParsing(
			`object mapping for [${path}] tried to parse field [${path}] as object, but found a concrete value`
		)
	}

	if (isNumericType(type)) {
		let number: number
		if (typeof value === 'number') number = value
		else if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))
			number = Number(value)
		else throw parseFailure(path, type, value)
		if (!Number.isFinite(number)) throw parseFailure(path, type, value)
		return INTEGER_TYPES.has(type) ? Math.trunc(number) : number
	}

	if (type === 'boolean') {
		if (typeof value === 'boolean') return value
		if (value === 'true') return true
		if (value === 'false' || value === '') return false
		throw parseFailure(path, type, value)
	}

	if (type === 'date') {
		if (typeof value === 'boolean') throw parseFailure(path, type, value)
		const time = parseDateValue(value, dateFormatOf(field))
		if (time === undefined) throw parseFailure(path, type, value)
		return time
	}

	if (type === 'keyword') {
		const text = String(value)
		const ignoreAbove = field.mapping.ignore_above
		if (typeof ignoreAbove === 'number' && text.length > ignoreAbove) return undefined
		return normalizeKeyword(host, field, text)
	}

	if (type === 'text') {
		return new TextValue(indexAnalyzerOf(host, field)(String(value)))
	}

	if (type === 'ip') {
		if (typeof value !== 'string' || !IP_PATTERN.test(value)) throw parseFailure(path, type, value)
		return value
	}

	throw parseFailure(path, type, value)
}

const guessType = (value: unknown, root: RootMapping): FieldMapping | undefined => {
	if (value === null || value === undefined) return undefined
	if (typeof value === 'boolean') return { type: 'boolean' }
	if (typeof value === 'number') return { type: Number.isInteger(value) ? 'long' : 'float' }
	if (typeof value === 'string') {
		if (root.date_detection !== false && isIsoDate(value)) return { type: 'date' }
		if (root.numeric_detection === true && /^-?\d+(\.\d+)?$/.test(value)) {
			return { type: value.includes('.') ? 'float' : 'long' }
		}
		return { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } }
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const guess = guessType(item, root)
			if (guess) return guess
		}
		return undefined
	}
	if (isPlainObject(value)) return { properties: {} }
	return undefined
}

type IndexState = {
	host: MappingHost
	unit: DocUnit
	copies: Array<{ target: string; value: unknown }>
}

const addValue = (unit: DocUnit, path: string, value: FieldValue) => {
	const list = unit.fields.get(path)
	if (list) list.push(value)
	else unit.fields.set(path, [value])
}

const indexLeaf = (state: IndexState, field: ResolvedField, value: unknown) => {
	const values = Array.isArray(value) ? value : [value]

	for (const item of values) {
		if (Array.isArray(item)) {
			// Nested arrays flatten, exactly like OpenSearch.
			indexLeaf(state, field, item)
			continue
		}

		const coerced = coerceLeafValue(state.host, field, item)
		if (coerced !== undefined) addValue(state.unit, field.path, coerced)

		for (const [subName, sub] of Object.entries(field.mapping.fields ?? {})) {
			const subField: ResolvedField = { path: `${field.path}.${subName}`, type: fieldTypeOf(sub), mapping: sub }
			const subValue = coerceLeafValue(state.host, subField, item)
			if (subValue !== undefined) addValue(state.unit, subField.path, subValue)
		}

		if (field.mapping.copy_to !== undefined && item !== null && item !== undefined) {
			const targets = Array.isArray(field.mapping.copy_to) ? field.mapping.copy_to : [field.mapping.copy_to]
			for (const target of targets) state.copies.push({ target: String(target), value: item })
		}
	}
}

const indexObject = (
	state: IndexState,
	node: FieldMapping,
	source: Source,
	path: string,
	dynamic: boolean | 'strict'
) => {
	const mode = parseDynamic(node.dynamic, path || '_doc') ?? dynamic

	for (const [name, value] of Object.entries(source)) {
		const childPath = path ? `${path}.${name}` : name
		let child = node.properties?.[name]

		if (!child) {
			if (mode === 'strict') throw strictDynamic(name, path || '_doc')
			if (mode === false) continue
			child = guessType(value, state.host.mapping)
			if (!child) continue
			node.properties ??= {}
			node.properties[name] = child
		}

		const type = fieldTypeOf(child)

		if (type === 'object') {
			for (const item of Array.isArray(value) ? value : [value]) {
				if (item === null || item === undefined) continue
				if (!isPlainObject(item)) {
					throw mapperParsing(
						`object mapping for [${childPath}] tried to parse field [${name}] as object, but found a concrete value`
					)
				}
				indexObject(state, child, item, childPath, mode)
			}
			continue
		}

		if (type === 'nested') {
			const units: DocUnit[] = []
			for (const item of Array.isArray(value) ? value : [value]) {
				if (item === null || item === undefined) continue
				if (!isPlainObject(item)) {
					throw mapperParsing(
						`object mapping for [${childPath}] tried to parse field [${name}] as object, but found a concrete value`
					)
				}
				const unit: DocUnit = { fields: new Map(), nested: new Map(), source: item, root: state.unit.root }
				indexObject({ ...state, unit }, child, item, childPath, mode)
				units.push(unit)
			}
			const existing = state.unit.nested.get(childPath)
			if (existing) existing.push(...units)
			else state.unit.nested.set(childPath, units)
			continue
		}

		indexLeaf(state, { path: childPath, type, mapping: child }, value)
	}
}

// Builds the searchable view of a document and grows the mapping for any
// field it has not seen before.
export const indexDocument = (host: MappingHost, doc: Doc) => {
	doc.fields = new Map()
	doc.nested = new Map()

	const state: IndexState = { host, unit: doc, copies: [] }
	indexObject(state, host.mapping, doc.source, '', parseDynamic(host.mapping.dynamic, '_doc') ?? true)

	for (const copy of state.copies) {
		const target = resolveField(host.mapping, copy.target)
		if (!target || target.type === 'object' || target.type === 'nested') {
			throw unsupported(`copy_to into the unmapped or non-leaf field "${copy.target}"`)
		}
		const coerced = coerceLeafValue(host, target, copy.value)
		if (coerced !== undefined) addValue(doc, target.path, coerced)
	}
}
