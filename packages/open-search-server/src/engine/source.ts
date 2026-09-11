import { illegalArgument } from '../errors'

export type Source = Record<string, unknown>

export const isPlainObject = (value: unknown): value is Source => {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const deepEqual = (a: unknown, b: unknown): boolean => {
	if (a === b) return true
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]))
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		const keys = Object.keys(a)
		if (keys.length !== Object.keys(b).length) return false
		return keys.every(key => key in b && deepEqual(a[key], b[key]))
	}
	return false
}

// Partial updates merge objects recursively and replace everything else,
// which is what the _update API does with a `doc`.
export const deepMerge = (target: Source, patch: Source): Source => {
	const result: Source = { ...target }
	for (const [key, value] of Object.entries(patch)) {
		const existing = result[key]
		result[key] = isPlainObject(existing) && isPlainObject(value) ? deepMerge(existing, value) : value
	}
	return result
}

export const clone = <T>(value: T): T => structuredClone(value)

type SourceFilter = { includes: string[]; excludes: string[] }

export const parseSourceFilter = (value: unknown): SourceFilter | false | undefined => {
	if (value === undefined || value === true) return undefined
	if (value === false) return false
	if (typeof value === 'string') return { includes: [value], excludes: [] }
	if (Array.isArray(value)) return { includes: value.map(String), excludes: [] }
	if (isPlainObject(value)) {
		const list = (v: unknown) => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)])
		return { includes: list(value.includes ?? value.include), excludes: list(value.excludes ?? value.exclude) }
	}
	throw illegalArgument(`Unknown _source value [${String(value)}]`)
}

const segmentPattern = (pattern: string) => new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type Pattern = RegExp[]

const compilePatterns = (patterns: string[]): Pattern[] => patterns.map(p => p.split('.').map(segmentPattern))

const prefixMatches = (pattern: Pattern, path: string[]) => {
	return path.every((segment, i) => pattern[i]?.test(segment) ?? false)
}

// A pattern covers a path when it names the path or one of its ancestors;
// it reaches into a path when it names something deeper.
const covers = (patterns: Pattern[], path: string[]) => {
	return patterns.some(p => p.length <= path.length && prefixMatches(p, path.slice(0, p.length)))
}

const reaches = (patterns: Pattern[], path: string[]) => {
	return patterns.some(p => p.length > path.length && prefixMatches(p, path))
}

const filterValue = (value: unknown, path: string[], includes: Pattern[], excludes: Pattern[]): unknown => {
	if (Array.isArray(value)) {
		return value.map(item => filterValue(item, path, includes, excludes))
	}
	if (!isPlainObject(value)) return value

	const result: Source = {}
	for (const [key, child] of Object.entries(value)) {
		const childPath = [...path, key]
		if (covers(excludes, childPath)) continue

		const included = includes.length === 0 || covers(includes, childPath)
		const container = isPlainObject(child) || Array.isArray(child)

		if (included) {
			result[key] =
				container && reaches(excludes, childPath) ? filterValue(child, childPath, [], excludes) : child
		} else if (container && reaches(includes, childPath)) {
			result[key] = filterValue(child, childPath, includes, excludes)
		}
	}
	return result
}

export const applySourceFilter = (source: Source, filter: SourceFilter | false | undefined): Source | undefined => {
	if (filter === false) return undefined
	if (filter === undefined) return source

	return filterValue(source, [], compilePatterns(filter.includes), compilePatterns(filter.excludes)) as Source
}

// Reads a dotted path through objects and arrays, flattening like a field.
export const readPath = (source: unknown, path: string): unknown[] => {
	let current: unknown[] = [source]
	for (const segment of path.split('.')) {
		const next: unknown[] = []
		for (const item of current) {
			const values = Array.isArray(item) ? item : [item]
			for (const value of values) {
				if (isPlainObject(value) && segment in value) {
					const child = value[segment]
					if (Array.isArray(child)) next.push(...child)
					else next.push(child)
				}
			}
		}
		current = next
	}
	return current.filter(v => v !== null && v !== undefined)
}
