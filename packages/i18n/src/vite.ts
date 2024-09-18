import { Plugin } from 'vite'
import { Cache, loadCache, saveCache } from './cache'
import { findNewTranslations, removeUnusedTranslations } from './diff'
import { findTranslatable } from './find'

export type Translator = (
	defaultLocale: string,
	list: {
		original: string
		locale: string
	}[]
) => TranslationResponse[] | Promise<TranslationResponse[]>

export type TranslationResponse = {
	original: string
	locale: string
	translation: string
}

export type I18nPluginProps = {
	/** The default locale that your original text is writen in. */
	default?: string

	/** A list of locales that you want your text translated too. */
	locales: string[]

	/** The callback that is responsible for translating the text. */
	translate: (
		defaultLocale: string,
		list: {
			original: string
			locale: string
		}[]
	) => TranslationResponse[] | Promise<TranslationResponse[]>
}

export const createI18nPlugin = (props: I18nPluginProps): Plugin[] => {
	let cache: Cache
	return [
		{
			name: 'awsless/i18n',
			enforce: 'pre',
			async buildStart() {
				const cwd = process.cwd()
				const originals = await findTranslatable(cwd)

				cache = await loadCache(cwd)

				// Clean up the unused transations from the cache
				removeUnusedTranslations(cache, originals, props.locales)

				const newOriginals = findNewTranslations(cache, originals, props.locales)

				if (newOriginals.length > 0) {
					const translations = await props.translate(props.default ?? 'en', newOriginals)
					for (const item of translations) {
						cache.set(item.original, item.locale, item.translation)
					}
				}

				await saveCache(cwd, cache)
			},
			transform(code) {
				let replaced = false

				if (code.includes(`$t\``)) {
					console.log(cache)

					for (const item of cache.entries()) {
						code = code.replaceAll(`$t\`${item.original}\``, () => {
							replaced = true
							return `$t.get(\`${item.original}\`, {${props.locales
								.map(locale => {
									return `"${locale}":\`${cache.get(item.original, locale)}\``
								})
								.join(',')}})`
						})
					}
				}

				if (code.includes(`get(t)\``)) {
					for (const item of cache.entries()) {
						code = code.replaceAll(`get(t)\`${item.original}\``, () => {
							replaced = true
							return `get(t).get(\`${item.original}\`, {${props.locales
								.map(locale => {
									return `"${locale}":\`${cache.get(item.original, locale)}\``
								})
								.join(',')}})`
						})
					}
				}

				if (!replaced) {
					return
				}

				return {
					code,
				}
			},
		},
	]
}
