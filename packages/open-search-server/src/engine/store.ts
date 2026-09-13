import { randomBytes } from 'node:crypto'
import { documentMissing, illegalArgument, indexExists, indexNotFound, unsupported, versionConflict } from '../errors'
import { AnalysisRegistry, buildAnalysis } from './analysis'
import { Doc, FieldMapping, indexDocument, mergeRootMapping, RootMapping, validateRootMapping } from './mapping'
import { clone, deepEqual, deepMerge, isPlainObject, Source } from './source'

const ALLOWED_SETTINGS = new Set([
	'number_of_shards',
	'number_of_replicas',
	'refresh_interval',
	'max_result_window',
	'max_ngram_diff',
	'max_shingle_diff',
	'analysis',
	'codec',
	'auto_expand_replicas',
	'hidden',
	'mapping',
	'query',
	'creation_date',
	'uuid',
	'version',
	'provided_name',
])

// Accepts both the flat `index.number_of_shards` and nested `index: {}` forms
// and rejects settings that would change behaviour (knn, sort, aliases...).
const normalizeSettings = (settings: unknown): Source => {
	if (settings === undefined) return {}
	if (!isPlainObject(settings)) throw illegalArgument('settings must be an object')

	const result: Source = {}
	const put = (key: string, value: unknown) => {
		const base = key.startsWith('index.') ? key.slice(6) : key
		const top = base.split('.')[0]!
		if (!ALLOWED_SETTINGS.has(top)) throw unsupported(`the index setting "${key}"`)
		if (base.includes('.')) {
			let node = result
			const parts = base.split('.')
			for (const part of parts.slice(0, -1)) {
				const next = node[part]
				node = isPlainObject(next) ? next : (node[part] = {})
			}
			node[parts[parts.length - 1]!] = value
		} else {
			result[base] = value
		}
	}

	for (const [key, value] of Object.entries(settings)) {
		if (key === 'index' && isPlainObject(value)) {
			for (const [subKey, subValue] of Object.entries(value)) put(subKey, subValue)
		} else {
			put(key, value)
		}
	}

	return result
}

export const generateId = () => randomBytes(15).toString('base64url')

export type WriteResult = {
	doc: Doc
	result: 'created' | 'updated' | 'noop'
}

export class Index {
	readonly uuid = randomBytes(11).toString('base64url')
	readonly createdAt = Date.now()
	readonly docs = new Map<string, Doc>()
	readonly settings: Source
	readonly analysis: AnalysisRegistry
	mapping: RootMapping
	private seqNo = 0
	private order = 0

	constructor(
		readonly name: string,
		settings: unknown,
		mappings: unknown
	) {
		this.settings = normalizeSettings(settings)
		this.analysis = buildAnalysis(this.settings.analysis)
		this.mapping = validateRootMapping(mappings, this.analysis)
	}

	putMapping(mappings: unknown) {
		const incoming = validateRootMapping(mappings, this.analysis)
		this.mapping = mergeRootMapping(this.mapping, incoming)
	}

	get(id: string): Doc | undefined {
		return this.docs.get(id)
	}

	put(id: string, source: Source, options: { create?: boolean } = {}): WriteResult {
		const existing = this.docs.get(id)
		if (existing && options.create) throw versionConflict(this.name, id)

		const doc: Doc = {
			index: this.name,
			id,
			version: existing ? existing.version + 1 : 1,
			seqNo: this.seqNo++,
			order: this.order++,
			source: clone(source),
			fields: new Map(),
			nested: new Map(),
			root: undefined as unknown as Doc,
		}
		doc.root = doc

		// A document that fails to parse must not leave half-grown mappings
		// behind, the same guarantee a real cluster gives.
		const snapshot = clone(this.mapping)
		try {
			indexDocument(this, doc)
		} catch (error) {
			this.mapping = snapshot
			throw error
		}

		this.docs.set(id, doc)
		return { doc, result: existing ? 'updated' : 'created' }
	}

	update(id: string, body: Source): WriteResult {
		if (body.script !== undefined) throw unsupported('scripted updates')
		for (const key of Object.keys(body)) {
			if (!['doc', 'doc_as_upsert', 'upsert', 'detect_noop', '_source', 'scripted_upsert'].includes(key)) {
				throw unsupported(`the "${key}" update option`)
			}
		}

		const existing = this.docs.get(id)
		const patch = body.doc

		if (!existing) {
			if (isPlainObject(body.upsert)) return this.put(id, body.upsert)
			if (body.doc_as_upsert === true && isPlainObject(patch)) return this.put(id, patch)
			throw documentMissing(this.name, id)
		}

		if (!isPlainObject(patch)) {
			throw illegalArgument('Validation Failed: 1: script or doc is missing;')
		}

		const merged = deepMerge(existing.source, patch)
		if (body.detect_noop !== false && deepEqual(merged, existing.source)) {
			return { doc: existing, result: 'noop' }
		}

		return this.put(id, merged)
	}

	delete(id: string): Doc | undefined {
		const doc = this.docs.get(id)
		if (doc) this.docs.delete(id)
		return doc
	}

	describe() {
		return {
			aliases: {},
			mappings: this.mapping,
			settings: {
				index: {
					creation_date: String(this.createdAt),
					number_of_shards: '1',
					number_of_replicas: '1',
					...this.settings,
					uuid: this.uuid,
					version: { created: '137217827' },
					provided_name: this.name,
				},
			},
		}
	}
}

const patternToRegExp = (pattern: string) => {
	return new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export class Store {
	readonly indices = new Map<string, Index>()

	create(name: string, settings: unknown, mappings: unknown): Index {
		if (name.includes(',') || name.includes('*')) throw unsupported('creating several indices at once')
		if (name.startsWith('_') || name.startsWith('-') || name.startsWith('+') || name !== name.toLowerCase()) {
			throw illegalArgument(
				`Invalid index name [${name}], must be lowercase and must not start with '_', '-', or '+'`
			)
		}
		if (this.indices.has(name)) throw indexExists(name)

		const index = new Index(name, settings, mappings)
		this.indices.set(name, index)
		return index
	}

	get(name: string): Index {
		const index = this.indices.get(name)
		if (!index) throw indexNotFound(name)
		return index
	}

	getOrCreate(name: string): Index {
		return this.indices.get(name) ?? this.create(name, undefined, undefined)
	}

	has(name: string) {
		return this.indices.has(name)
	}

	// Resolves `a,b`, `logs-*`, `_all` and `*` the way the search and delete
	// APIs do. Names without a wildcard must exist.
	resolve(expression: string | undefined): Index[] {
		if (expression === undefined || expression === '' || expression === '_all' || expression === '*') {
			return [...this.indices.values()]
		}

		const result: Index[] = []
		for (const part of expression.split(',')) {
			if (part.includes('*')) {
				const regex = patternToRegExp(part)
				for (const index of this.indices.values()) {
					if (regex.test(index.name) && !result.includes(index)) result.push(index)
				}
			} else {
				const index = this.get(part)
				if (!result.includes(index)) result.push(index)
			}
		}
		return result
	}

	delete(expression: string): void {
		for (const index of this.resolve(expression)) this.indices.delete(index.name)
	}

	reset() {
		this.indices.clear()
	}
}

export type { FieldMapping }
