import { readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

export const loadCache = async (cwd: string): Promise<Cache> => {
	const file = join(cwd, 'i18n.json')

	try {
		await stat(file)
	} catch (error) {
		return new Cache()
	}

	const data = await readFile(file, 'utf8')
	return new Cache(JSON.parse(data))
}

export const saveCache = async (cwd: string, cache: Cache) => {
	await writeFile(join(cwd, 'i18n.json'), JSON.stringify(cache, undefined, 2))
}

export class Cache {
	constructor(private data: Record<string, Record<string, string>> = {}) {}

	set(source: string, locale: string, translation: string) {
		if (!this.data[source]) {
			this.data[source] = {}
		}

		if (!this.data[source][locale]) {
			this.data[source][locale] = translation
		}
	}

	get(source: string, locale: string) {
		return this.data[source]?.[locale]
	}

	has(source: string, locale: string) {
		return typeof this.get(source, locale) === 'string'
	}

	delete(source: string, locale: string) {
		if (this.data[source]?.[locale]) {
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
		return this.data
	}
}
