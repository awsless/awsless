import { extname } from 'node:path'
import MagicString from 'magic-string'
import { AST } from 'svelte/compiler'
import { Plugin } from 'vite'
import { Cache, loadGeneratedCache, loadOverrideCache, mergeCaches, saveCache } from './cache'
import { findNewTranslations, removeUnusedTranslations } from './diff'
import { findTranslatable, findTranslatableInCode, isIgnoredPath } from './find'
import { hasT, parseT, transformT, validateTranslation } from './t'

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
const LANG_IMPORT = "import { lang } from '@awsless/i18n/svelte'"

type Logger = {
	info: (message: string) => void
	warn: (message: string) => void
}

// Vite ids keep their query (?svelte&type=style), which extname would not strip.
const isSvelteFile = (id = '') => extname(id.split('?')[0]!) === '.svelte'

const importsLang = (ast: AST.Root) => {
	for (const script of [ast.instance, ast.module]) {
		for (const node of script?.content.body ?? []) {
			if (node.type === 'ImportDeclaration' && node.specifiers.some(item => item.local.name === 'lang')) {
				return true
			}
		}
	}

	return false
}

export const i18n = (props: I18nPluginProps): Plugin => {
	let cache: Cache
	let generatedCache: Cache
	let overrideCache: Cache

	// Saves land in bursts, so the runs queue up: the next one sees what the
	// previous one translated instead of asking for the same texts again.
	let queue: Promise<void> = Promise.resolve()

	const translateMissing = (cwd: string, sourceTexts: string[], log: Logger) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sourceTexts, log))
		return queue
	}

	const translateNow = async (cwd: string, sourceTexts: string[], log: Logger) => {
		const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales)

		if (newSourceTexts.length > 0) {
			log.info(`Translating ${newSourceTexts.length} new texts.`)

			const translations = await props.translate(props.default ?? 'en', newSourceTexts)

			log.info(`Translated ${translations.length} texts.`)

			for (const item of translations) {
				// A translation that lost a placeholder or tag would break the
				// markup, so the source text is shown for that locale instead.
				const problem = validateTranslation(item.source, item.translation)

				if (problem) {
					log.warn(`Skipped the "${item.locale}" translation of "${item.source}": ${problem}.`)
					continue
				}

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

			const sourceTexts = await findTranslatableInCode(file, await read())

			if (sourceTexts.length > 0) {
				await translateMissing(process.cwd(), sourceTexts, this.environment.logger)
			}
		},
		transform(code, id) {
			const withLangT = code.includes('lang.t`')
			const withT = isSvelteFile(id) && hasT(code)

			if (!withLangT && !withT) {
				return
			}

			const sources = new Set<string>()

			for (const item of cache.entries()) {
				sources.add(item.source)
			}

			const langT = (source: string) => {
				const translations = props.locales
					.map(locale => {
						const translation = cache.get(source, locale)

						// Skip adding the translated text if it's the
						// same as the original source text.
						if (translation === undefined || translation === source) {
							return
						}

						return `"${locale}":\`${translation}\``
					})
					.filter(v => !!v)

				return `lang.t.get(\`${source}\`, {${translations.join(',')}})`
			}

			const rewriteLangT = (text: string) => {
				for (const source of sources) {
					text = text.split(`lang.t\`${source}\``).join(langT(source))
				}

				return text
			}

			const transformedCode = new MagicString(code)
			const replaced: { start: number; end: number }[] = []

			if (withT) {
				const { ast, components } = parseT(code, id)
				const lookup = (source: string, locale: string) => cache.get(source, locale)
				let called = false

				for (const component of components) {
					for (const edit of transformT(component, props.locales, lookup, message => this.warn(message))) {
						if (edit.text === '') {
							if (edit.end > edit.start) {
								transformedCode.remove(edit.start, edit.end)
							}
						} else if (edit.start === edit.end) {
							transformedCode.appendLeft(edit.start, rewriteLangT(edit.text))
							called = true
						} else {
							transformedCode.overwrite(edit.start, edit.end, rewriteLangT(edit.text))
							replaced.push(edit)
							called = true
						}
					}
				}

				if (called && !importsLang(ast)) {
					if (ast.instance) {
						// The program starts right after the `<script ...>` tag.
						const { start } = ast.instance.content as unknown as { start: number }
						transformedCode.appendLeft(start, `\n\t${LANG_IMPORT}`)
					} else {
						transformedCode.prepend(`<script>\n\t${LANG_IMPORT}\n</script>\n`)
					}
				}
			}

			if (withLangT) {
				for (const source of sources) {
					const pattern = `lang.t\`${source}\``
					let index = code.indexOf(pattern)

					while (index !== -1) {
						// Occurrences inside a rewritten text run were handled with its call.
						if (!replaced.some(item => index >= item.start && index < item.end)) {
							transformedCode.overwrite(index, index + pattern.length, langT(source))
						}

						index = code.indexOf(pattern, index + pattern.length)
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
