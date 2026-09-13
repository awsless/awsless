import MagicString from 'magic-string'
import { Plugin } from 'vite'
import { Cache, loadGeneratedCache, loadOverrideCache, mergeCaches, saveCache } from './cache'
import { findNewTranslations, removeUnusedTranslations } from './diff'
import { findTranslatable, findTranslatableInCode, isIgnoredPath } from './find'

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

const SOURCE_FILE = /\.(svelte|ts|js)$/

export const i18n = (props: I18nPluginProps): Plugin => {
	let cache: Cache
	let generatedCache: Cache
	let overrideCache: Cache

	// Saves land in bursts, so the runs queue up: the next one sees what the
	// previous one translated instead of asking for the same texts again.
	let queue: Promise<void> = Promise.resolve()

	const translateMissing = (cwd: string, sourceTexts: string[], log: (message: string) => void) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sourceTexts, log))
		return queue
	}

	const translateNow = async (cwd: string, sourceTexts: string[], log: (message: string) => void) => {
		const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales)

		if (newSourceTexts.length > 0) {
			log(`Translating ${newSourceTexts.length} new texts.`)

			const translations = await props.translate(props.default ?? 'en', newSourceTexts)

			log(`Translated ${translations.length} texts.`)

			for (const item of translations) {
				generatedCache.set(item.source, item.locale, item.translation)
			}
		}

		cache = mergeCaches(generatedCache, overrideCache)

		await saveCache(cwd, generatedCache)
	}

	return {
		name: 'awsless/i18n',
		enforce: 'pre',
		async buildStart() {
			const cwd = process.cwd()

			this.info('Finding all translatable text...')
			const sourceTexts = await findTranslatable(cwd)

			generatedCache = await loadGeneratedCache(cwd)
			overrideCache = await loadOverrideCache(cwd)

			// Clean up the unused transations from the cache
			removeUnusedTranslations(generatedCache, sourceTexts, props.locales)

			cache = mergeCaches(generatedCache, overrideCache)

			await translateMissing(cwd, sourceTexts, message => this.info(message))

			this.info(`Translating done.`)
		},
		// A file saved during dev gets its new texts translated before the
		// module is transformed, so no restart is needed to see them.
		async hotUpdate({ file, read }) {
			if (!cache || !SOURCE_FILE.test(file) || isIgnoredPath(file)) {
				return
			}

			const sourceTexts = await findTranslatableInCode(file, await read())

			if (sourceTexts.length > 0) {
				await translateMissing(process.cwd(), sourceTexts, message => this.environment.logger.info(message))
			}
		},
		transform(code) {
			if (code.includes('lang.t`')) {
				const transformedCode = new MagicString(code)

				for (const item of cache.entries()) {
					transformedCode.replaceAll(
						`lang.t\`${item.source}\``,
						`lang.t.get(\`${item.source}\`, {${props.locales
							.map(locale => {
								const translation = cache.get(item.source, locale)

								// Skip adding the translated text if it's the
								// same as the original source text.
								if (translation === item.source) {
									return
								}

								return `"${locale}":\`${translation}\``
							})
							.filter(v => !!v)
							.join(',')}})`
					)
				}
				return {
					code: transformedCode.toString(),
					map: transformedCode.generateMap({
						hires: true,
					}),
				}
			}

			return
		},
	}
}
