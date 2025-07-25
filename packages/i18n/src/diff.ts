import { Cache } from './cache'

export const findNewTranslations = (cache: Cache, sources: string[], locales: string[]) => {
	const list: { source: string; locale: string }[] = []

	for (const source of sources) {
		for (const locale of locales) {
			if (!cache.has(source, locale)) {
				list.push({ source, locale })
			}
		}
	}

	return list
}

export const removeUnusedTranslations = (cache: Cache, sources: string[], locales: string[]) => {
	for (const item of cache.entries()) {
		if (!locales.includes(item.locale) || !sources.includes(item.source)) {
			cache.delete(item.source, item.locale)
		}
	}
}
