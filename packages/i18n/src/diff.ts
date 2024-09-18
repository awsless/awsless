import { Cache } from './cache'

export const findNewTranslations = (cache: Cache, originals: string[], locales: string[]) => {
	const list: { original: string; locale: string }[] = []

	for (const original of originals) {
		for (const locale of locales) {
			if (!cache.has(original, locale)) {
				list.push({ original, locale })
			}
		}
	}

	return list
}

export const removeUnusedTranslations = (cache: Cache, originals: string[], locales: string[]) => {
	for (const item of cache.entries()) {
		if (!locales.includes(item.locale) || !originals.includes(item.original)) {
			cache.delete(item.original, item.locale)
		}
	}
}
