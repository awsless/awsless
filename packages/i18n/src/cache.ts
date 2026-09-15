import { readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

const GENERATED_CACHE_FILE = 'i18n.generated.json'
const OVERRIDE_CACHE_FILE = 'i18n.json'

/** Identifies a translation: the source text plus the context it was
 * found with, if any. The same text can carry different meanings in
 * different contexts. */
export type Key = {
	source: string
	context?: string
}

// context → source → locale → translation
type Data = Record<string, Record<string, Record<string, string>>>

// The format before contexts existed: source → locale → translation
type LegacyData = Record<string, Record<string, string>>

const loadFile = async (cwd: string, fileName: string): Promise<Cache> => {
	const file = join(cwd, fileName)

	try {
		await stat(file)
	} catch {
		return new Cache()
	}

	const data = await readFile(file, 'utf8')
	return new Cache(JSON.parse(data))
}

export const loadGeneratedCache = async (cwd: string) => {
	return loadFile(cwd, GENERATED_CACHE_FILE)
}

export const loadOverrideCache = async (cwd: string) => {
	return loadFile(cwd, OVERRIDE_CACHE_FILE)
}

export const loadCache = async (cwd: string): Promise<Cache> => {
	return mergeCaches(await loadGeneratedCache(cwd), await loadOverrideCache(cwd))
}

// Leaves the file untouched when nothing changed so watchers don't fire for nothing
export const saveCache = async (cwd: string, cache: Cache) => {
	const file = join(cwd, GENERATED_CACHE_FILE)
	const content = JSON.stringify(cache.toJSON(), undefined, '\t') + '\n'

	try {
		if ((await readFile(file, 'utf8')) === content) {
			return false
		}
	} catch {
		// no file yet
	}

	await writeFile(file, content)

	return true
}

export const mergeCaches = (...caches: Cache[]) => {
	const merged = new Cache()

	for (const cache of caches) {
		for (const item of cache.entries()) {
			merged.replace(item, item.locale, item.translation)
		}
	}

	return merged
}

// A file written before contexts existed has translations directly under
// the source text, so it's read as the context-less group.
const migrate = (data: Data | LegacyData): Data => {
	const legacy = Object.values(data).some(value => Object.values(value).some(entry => typeof entry === 'string'))

	return legacy ? { '': data as LegacyData } : (data as Data)
}

const sorted = <T>(record: Record<string, T>, map: (value: T) => unknown = value => value) => {
	return Object.fromEntries(
		Object.entries(record)
			.toSorted(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => [key, map(value)])
	)
}

export class Cache {
	private data: Data

	constructor(data: Data | LegacyData = {}) {
		this.data = migrate(data)
	}

	private group(key: Key, create: true): Record<string, string>
	private group(key: Key, create?: false): Record<string, string> | undefined
	private group(key: Key, create = false) {
		const context = key.context ?? ''

		if (create) {
			this.data[context] ??= {}
			this.data[context][key.source] ??= {}
		}

		return this.data[context]?.[key.source]
	}

	set(key: Key, locale: string, translation: string) {
		const group = this.group(key, true)

		if (typeof group[locale] === 'undefined') {
			group[locale] = translation
		}
	}

	replace(key: Key, locale: string, translation: string) {
		this.group(key, true)[locale] = translation
	}

	get(key: Key, locale: string) {
		return this.group(key)?.[locale]
	}

	has(key: Key, locale: string) {
		return typeof this.get(key, locale) === 'string'
	}

	delete(key: Key, locale: string) {
		const context = key.context ?? ''
		const group = this.group(key)

		if (!group) {
			return
		}

		delete group[locale]

		if (Object.keys(group).length === 0) {
			delete this.data[context]![key.source]
		}

		if (Object.keys(this.data[context]!).length === 0) {
			delete this.data[context]
		}
	}

	*keys(): Generator<Key> {
		for (const [context, sources] of Object.entries(this.data)) {
			for (const source of Object.keys(sources)) {
				yield context ? { source, context } : { source }
			}
		}
	}

	*entries(): Generator<Key & { locale: string; translation: string }> {
		for (const key of this.keys()) {
			for (const [locale, translation] of Object.entries(this.group(key)!)) {
				yield { ...key, locale, translation }
			}
		}
	}

	toJSON() {
		return sorted(this.data, sources => sorted(sources, locales => sorted(locales)))
	}
}
