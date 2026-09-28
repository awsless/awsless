import { Cache, Key } from './cache'

export const findNewTranslations = (cache: Cache, keys: Key[], locales: string[]) => {
	const list: (Key & { locale: string })[] = []

	for (const key of keys) {
		for (const locale of locales) {
			if (!cache.has(key, locale)) {
				list.push({ ...key, locale })
			}
		}
	}

	return list
}

export const removeUnusedTranslations = (cache: Cache, keys: Key[], locales: string[]) => {
	const used = new Set(keys.map(key => `${key.context ?? ''}\n${key.source}`))

	for (const item of cache.entries()) {
		if (!locales.includes(item.locale) || !used.has(`${item.context ?? ''}\n${item.source}`)) {
			cache.delete(item, item.locale)
		}
	}
}
