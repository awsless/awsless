import { readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

const GENERATED_CACHE_FILE = 'i18n.generated.json'
const OVERRIDE_CACHE_FILE = 'i18n.json'

const loadFile = async (cwd: string, fileName: string): Promise<Cache> => {
	const file = join(cwd, fileName)

	try {
		await stat(file)
	} catch (error) {
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

export const saveCache = async (cwd: string, cache: Cache) => {
	await writeFile(join(cwd, GENERATED_CACHE_FILE), JSON.stringify(cache.toJSON(), undefined, 2) + '\n')
}

export const mergeCaches = (...caches: Cache[]) => {
	const merged = new Cache()

	for (const cache of caches) {
		for (const item of cache.entries()) {
			merged.replace(item.source, item.locale, item.translation)
		}
	}

	return merged
}

export class Cache {
	constructor(private data: Record<string, Record<string, string>> = {}) {}

	set(source: string, locale: string, translation: string) {
		if (!this.data[source]) {
			this.data[source] = {}
		}

		if (typeof this.data[source][locale] === 'undefined') {
			this.data[source][locale] = translation
		}
	}

	replace(source: string, locale: string, translation: string) {
		if (!this.data[source]) {
			this.data[source] = {}
		}

		this.data[source][locale] = translation
	}

	get(source: string, locale: string) {
		return this.data[source]?.[locale]
	}

	has(source: string, locale: string) {
		return typeof this.get(source, locale) === 'string'
	}

	delete(source: string, locale: string) {
		if (typeof this.data[source]?.[locale] !== 'undefined') {
			delete this.data[source][locale]
		}

		if (this.data[source] && Object.keys(this.data[source]).length === 0) {
			delete this.data[source]
		}
	}

	*entries() {
		for (const [source, locales] of Object.entries(this.data)) {
			for (const [locale, translation] of Object.entries(locales)) {
				yield { source, locale, translation }
			}
		}
	}

	toJSON() {
		return Object.fromEntries(
			Object.entries(this.data)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([source, locales]) => {
					return [
						source,
						Object.fromEntries(
							Object.entries(locales).sort(([left], [right]) => left.localeCompare(right))
						),
					]
				})
		)
	}
}
