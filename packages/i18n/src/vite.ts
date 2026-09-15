import MagicString from 'magic-string'
import { Plugin } from 'vite'
import { Cache, loadGeneratedCache, loadOverrideCache, mergeCaches, saveCache } from './cache'
import { rewriteComponent } from './component'
import { findNewTranslations, removeUnusedTranslations } from './diff'
import {
	dedupe,
	findTranslatable,
	findTranslatableInCode,
	hasComponents,
	hasTemplates,
	isIgnoredPath,
	Translatable,
} from './find'
import { parseSvelte } from './find/svelte'
import { validateTranslation } from './tree'

export type Translator = (
	defaultLocale: string,
	list: {
		source: string
		locale: string
		/** A hint about where the text is used, from the context attribute of a <T>. */
		context?: string
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

type Logger = { info: (message: string) => void; warn: (message: string) => void }

export const i18n = (props: I18nPluginProps): Plugin => {
	let cache: Cache
	let generatedCache: Cache
	let overrideCache: Cache

	// Saves land in bursts, so the runs queue up: the next one sees what the
	// previous one translated instead of asking for the same texts again.
	let queue: Promise<void> = Promise.resolve()

	const translateMissing = (cwd: string, sourceTexts: Translatable[], log: Logger) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sourceTexts, log))
		return queue
	}

	const translateNow = async (cwd: string, sourceTexts: Translatable[], log: Logger) => {
		const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales)

		if (newSourceTexts.length > 0) {
			log.info(`Translating ${newSourceTexts.length} new texts.`)

			const translations = await props.translate(props.default ?? 'en', newSourceTexts)

			log.info(`Translated ${translations.length} texts.`)

			for (const item of translations) {
				// A translation that lost a tag or placeholder is dropped so
				// the next run asks for it again instead of shipping it.
				const error = validateTranslation(item.source, item.translation)

				if (error) {
					log.warn(`Skipped the "${item.locale}" translation of "${item.source}": ${error}`)
					continue
				}

				generatedCache.set(item, item.locale, item.translation)
			}
		}

		cache = mergeCaches(generatedCache, overrideCache)

		await saveCache(cwd, generatedCache)
	}

	const templateReplacement = (source: string) => {
		const translations = props.locales
			.map(locale => {
				const translation = cache.get({ source }, locale)

				// Skip adding the translated text if it's the
				// same as the original source text.
				if (typeof translation !== 'string' || translation === source) {
					return
				}

				return `"${locale}":\`${translation}\``
			})
			.filter(v => !!v)
			.join(',')

		return `lang.t.get(\`${source}\`, {${translations}})`
	}

	const inlineTemplates = (code: string) => {
		if (!hasTemplates(code)) {
			return code
		}

		for (const { source, context } of cache.keys()) {
			if (context) {
				continue
			}

			code = code.replaceAll(`lang.t\`${source}\``, templateReplacement(source))
		}

		return code
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

			await translateMissing(cwd, sourceTexts, {
				info: message => this.info(message),
				warn: message => this.warn(message),
			})

			this.info(`Translating done.`)
		},
		// A file saved during dev gets its new texts translated before the
		// module is transformed, so no restart is needed to see them.
		async hotUpdate({ file, read }) {
			if (!cache || !SOURCE_FILE.test(file) || isIgnoredPath(file)) {
				return
			}

			const sourceTexts = dedupe(findTranslatableInCode(file, await read()))

			if (sourceTexts.length > 0) {
				const logger = this.environment.logger

				await translateMissing(process.cwd(), sourceTexts, {
					info: message => logger.info(message),
					warn: message => logger.warn(message),
				})
			}
		},
		transform(code, id) {
			const file = id?.split('?')[0] ?? ''
			const templates = hasTemplates(code)
			const components = hasComponents(file, code)

			if (!templates && !components) {
				return
			}

			const transformedCode = new MagicString(code)

			// The template calls are replaced first, a <T> may contain one
			// and its rewrite has to cover the replaced range.
			if (templates) {
				// Template calls never carry a context
				for (const { source, context } of cache.keys()) {
					if (!context) {
						transformedCode.replaceAll(`lang.t\`${source}\``, templateReplacement(source))
					}
				}
			}

			if (components) {
				for (const match of parseSvelte(code).components) {
					if (match.error) {
						this.warn(`${match.error} (${file})`)
					} else if (match.source) {
						transformedCode.overwrite(
							match.start,
							match.end,
							rewriteComponent(match, props.locales, cache, inlineTemplates, message =>
								this.warn(message)
							)
						)
					}
				}
			}

			return {
				code: transformedCode.toString(),
				map: transformedCode.generateMap({
					hires: true,
				}),
			}
		},
	}
}
