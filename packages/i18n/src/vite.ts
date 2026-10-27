import MagicString from 'magic-string'
import { Plugin } from 'vite'
import { join } from 'path'
import {
	Cache,
	GENERATED_CACHE_FILE,
	loadCache,
	loadGeneratedCache,
	loadOverrideCache,
	mergeCaches,
	OVERRIDE_CACHE_FILE,
	saveCache,
} from './cache'
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
	/** Must be echoed from the request, it's part of the translation key. */
	context?: string
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

	/** Translate new texts while the dev server runs. When off, dev only uses
	 * the translations already cached and builds still translate everything.
	 * Run `translate` to translate without building.
	 * @default false
	 */
	translateInDev?: boolean
}

export type I18nPluginApi = {
	/** Finds every translatable text under `cwd`, translates the missing ones
	 * and drops the unused ones from the generated cache. */
	translate(cwd: string, log: Logger): Promise<void>
}

const SOURCE_FILE = /\.(svelte|ts|js)$/

// A file with a syntax error is left to the svelte plugin, its message
// is better than ours.
const parseComponents = (code: string) => {
	try {
		return parseSvelte(code).components
	} catch {
		return []
	}
}

export type Logger = { info: (message: string) => void; warn: (message: string) => void }

export const PLUGIN_NAME = 'awsless/i18n'

export const i18n = (props: I18nPluginProps): Plugin<I18nPluginApi> => {
	let cache: Cache
	let generatedCache: Cache
	let overrideCache: Cache

	// A failed translation only fails a build. The dev server keeps running
	// with the source text and asks again on the next save or restart.
	let dev = false

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

			let translations: TranslationResponse[]

			try {
				translations = await props.translate(props.default ?? 'en', newSourceTexts)
			} catch (error) {
				if (!dev) {
					throw error
				}

				const reason = error instanceof Error ? error.message : String(error)
				log.warn(`Translating failed, the new texts show untranslated for now: ${reason}`)
				return
			}

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

	const translateAll = async (cwd: string, log: Logger) => {
		log.info('Finding all translatable text...')
		const sourceTexts = await findTranslatable(cwd)

		generatedCache = await loadGeneratedCache(cwd)
		overrideCache = await loadOverrideCache(cwd)

		// Clean up the unused transations from the cache
		removeUnusedTranslations(generatedCache, sourceTexts, props.locales)

		cache = mergeCaches(generatedCache, overrideCache)

		await translateMissing(cwd, sourceTexts, log)

		log.info(`Translating done.`)
	}

	const translating = () => !dev || props.translateInDev === true

	// Returns whether the translations on disk differ from the ones in use,
	// our own saves match and don't count as a change.
	const reloadCache = async (cwd: string) => {
		generatedCache = await loadGeneratedCache(cwd)
		overrideCache = await loadOverrideCache(cwd)

		const next = mergeCaches(generatedCache, overrideCache)
		const changed = JSON.stringify(next.toJSON()) !== JSON.stringify(cache.toJSON())

		cache = next

		return changed
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
		name: PLUGIN_NAME,
		enforce: 'pre',
		api: {
			translate: translateAll,
		},
		configResolved(config) {
			dev = config.command === 'serve'
		},
		// Picks up translations from the translate CLI or an edited i18n.json
		// without restarting. The translations are inlined while transforming,
		// so every module is transformed again.
		configureServer(server) {
			const cwd = process.cwd()
			const files = [GENERATED_CACHE_FILE, OVERRIDE_CACHE_FILE].map(file => join(cwd, file))

			const onChange = (file: string) => {
				if (!cache || !files.includes(file)) {
					return
				}

				queue = queue
					.catch(() => {})
					.then(async () => {
						if (await reloadCache(cwd)) {
							for (const environment of Object.values(server.environments)) {
								environment.moduleGraph.invalidateAll()
							}

							server.ws.send({ type: 'full-reload' })
						}
					})
					.catch(error => {
						server.config.logger.warn(`Reloading the translations failed: ${error}`)
					})
			}

			server.watcher.on('add', onChange)
			server.watcher.on('change', onChange)
			server.watcher.on('unlink', onChange)
		},
		async buildStart() {
			const cwd = process.cwd()

			// Unused texts aren't pruned either, they may be mid-edit and
			// nothing would translate them again until the next build.
			if (!translating()) {
				cache = await loadCache(cwd)
				return
			}

			await translateAll(cwd, {
				info: message => this.info(message),
				warn: message => this.warn(message),
			})
		},
		// A file saved during dev gets its new texts translated before the
		// module is transformed, so no restart is needed to see them.
		async hotUpdate({ file, read }) {
			if (!cache || !translating() || !SOURCE_FILE.test(file) || isIgnoredPath(file)) {
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
				for (const match of parseComponents(code)) {
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
