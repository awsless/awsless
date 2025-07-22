import { Plugin } from 'vite'
import { Cache, loadCache, saveCache } from './cache'
import { findNewTranslations, removeUnusedTranslations } from './diff'
import { findTranslatable } from './find'

export type Translator = (
	defaultLocale: string,
	list: {
		source: string
		locale: string
	}[]
) => TranslationResponse[] | Promise<TranslationResponse[]>

export type TranslationResponse = {
	source: string
	locale: string
	translation: string
}

export type I18nPluginProps = {
	/** The original language your source text is written in.
	 * @default "en"
	 */
	default?: string

	/** The list of target locales to translate your text into. */
	locales: string[]

	/** Function that performs the translation of a given text. */
	translate: Translator
}

export const createI18nPlugin = (props: I18nPluginProps): Plugin => {
	let cache: Cache
	return {
		name: 'awsless/i18n',
		enforce: 'pre',
		async buildStart() {
			const cwd = process.cwd()

			this.info('Finding all translatable text...')
			const sourceTexts = await findTranslatable(cwd)

			cache = await loadCache(cwd)

			// Clean up the unused transations from the cache
			removeUnusedTranslations(cache, sourceTexts, props.locales)

			const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales)

			if (newSourceTexts.length > 0) {
				this.info(`Translating ${newSourceTexts.length} new texts.`)

				const translations = await props.translate(props.default ?? 'en', newSourceTexts)

				this.info(`Translated ${translations.length} texts.`)

				for (const item of translations) {
					cache.set(item.source, item.locale, item.translation)
				}
			}

			await saveCache(cwd, cache)
			this.info(`Translating done.`)
		},
		transform(code) {
			let replaced = false

			if (code.includes('lang.t`')) {
				for (const item of cache.entries()) {
					code = code.replaceAll(`lang.t\`${item.source}\``, () => {
						replaced = true
						return `lang.t.get(\`${item.source}\`, {${props.locales
							.map(locale => {
								return `"${locale}":\`${cache.get(item.source, locale)}\``
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
	}
}
