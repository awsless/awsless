import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

// export type Cache = Record<string, Record<string, string | undefined> | undefined>

export const loadCache = async (cwd: string): Promise<Cache> => {
	try {
		const data = await readFile(join(cwd, 'i18n.json'), 'utf8')
		return new Cache(JSON.parse(data))
	} catch (error) {
		return new Cache()
	}
}

export const saveCache = async (cwd: string, cache: Cache) => {
	await writeFile(join(cwd, 'i18n.json'), JSON.stringify(cache, undefined, 2))
}

export class Cache {
	constructor(private data: Record<string, Record<string, string>> = {}) {}

	set(original: string, locale: string, translation: string) {
		if (!this.data[original]) {
			this.data[original] = {}
		}

		if (!this.data[original][locale]) {
			this.data[original][locale] = translation
		}
	}

	get(original: string, locale: string) {
		return this.data[original]?.[locale]
	}

	has(original: string, locale: string) {
		return typeof this.get(original, locale) === 'string'
	}

	delete(original: string, locale: string) {
		if (this.data[original]?.[locale]) {
			delete this.data[original][locale]
		}

		if (this.data[original] && Object.keys(this.data[original]).length === 0) {
			delete this.data[original]
		}
	}

	*entries() {
		for (const [original, locales] of Object.entries(this.data)) {
			for (const [locale, translation] of Object.entries(locales)) {
				yield { original, locale, translation }
			}
		}
	}

	// *originals() {
	// 	for (const [original] of Object.entries(this.data)) {
	// 		yield original
	// 	}
	// }

	toJSON() {
		return this.data
	}
}
