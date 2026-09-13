import { extname } from 'node:path'
import MagicString from 'magic-string'
import { Plugin } from 'vite'
import { Cache, loadGeneratedCache, loadOverrideCache, mergeCaches, saveCache } from './cache'
import { findNewTranslations, removeUnusedTranslations } from './diff'
import { findTranslatable, findTranslatableInCode, isIgnoredPath, Source, Tagged } from './find'
import { findTaggedTemplates } from './find/svelte'
import { findTypescriptTagged } from './find/typescript'
import { Edit, hasT, parseT, transformT, validatePlaceholders, validateTranslation } from './t'

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
// A private alias, so a `lang` of the component itself can't shadow the calls.
const LANG_IMPORT = "import { lang as __i18n_lang } from '@awsless/i18n/svelte'"

type Logger = {
	info: (message: string) => void
	warn: (message: string) => void
}

const outermost = (tagged: Tagged[]) =>
	tagged.filter(item => !tagged.some(other => other !== item && other.start <= item.start && item.end <= other.end))

// Vite ids keep their query (?svelte&type=style), which extname would not strip.
const isSvelteFile = (id = '') => extname(id.split('?')[0]!) === '.svelte'

export const i18n = (props: I18nPluginProps): Plugin => {
	let cache: Cache
	let generatedCache: Cache
	let overrideCache: Cache

	// Saves land in bursts, so the runs queue up: the next one sees what the
	// previous one translated instead of asking for the same texts again.
	let queue: Promise<void> = Promise.resolve()

	const translateMissing = (cwd: string, sources: Source[], log: Logger) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sources, log))
		return queue
	}

	const translateNow = async (cwd: string, sources: Source[], log: Logger) => {
		const newSourceTexts = findNewTranslations(
			cache,
			sources.map(item => item.source),
			props.locales
		)

		// Numbered tags only mean something in markup; the same text found as
		// both is held to the markup rules.
		const markup = new Set(sources.filter(item => item.kind === 'markup').map(item => item.source))

		if (newSourceTexts.length > 0) {
			log.info(`Translating ${newSourceTexts.length} new texts.`)

			const translations = await props.translate(props.default ?? 'en', newSourceTexts)

			log.info(`Translated ${translations.length} texts.`)

			for (const item of translations) {
				// A translation that lost a placeholder or tag would break the
				// markup, so the source text is shown for that locale instead.
				const validate = markup.has(item.source) ? validateTranslation : validatePlaceholders
				const problem = validate(item.source, item.translation)

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
			const sources = await findTranslatable(cwd)

			generatedCache = await loadGeneratedCache(cwd)
			overrideCache = await loadOverrideCache(cwd)

			// Clean up the unused transations from the cache
			removeUnusedTranslations(
				generatedCache,
				sources.map(item => item.source),
				props.locales
			)

			cache = mergeCaches(generatedCache, overrideCache)

			await translateMissing(cwd, sources, {
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

			const sources = await findTranslatableInCode(file, await read())

			if (sources.length > 0) {
				await translateMissing(process.cwd(), sources, this.environment.logger)
			}
		},
		transform(code, id) {
			const svelte = isSvelteFile(id)

			if (!code.includes('lang.t`') && !(svelte && hasT(code))) {
				return
			}

			const sources = new Set<string>()

			for (const item of cache.entries()) {
				sources.add(item.source)
			}

			// Templates inside a template compose from the inside out: the inner
			// call is spliced into the outer text, and into its translations, at
			// the offsets oxc reports for that text parsed as a template literal.
			const compose = (text: string): string => {
				const inner = outermost(findTypescriptTagged(`\`${text}\``).filter(item => sources.has(item.source)))
				let result = text

				for (const item of inner.toSorted((a, b) => b.start - a.start)) {
					result = result.slice(0, item.start - 1) + render(item.source) + result.slice(item.end - 1)
				}

				return result
			}

			const render = (source: string): string => {
				const translations = props.locales
					.map(locale => {
						const translation = cache.get(source, locale)

						// Skip adding the translated text if it's the
						// same as the original source text.
						if (translation === undefined || translation === source) {
							return
						}

						return `"${locale}":\`${compose(translation)}\``
					})
					.filter(v => !!v)

				return `lang.t.get(\`${compose(source)}\`, {${translations.join(',')}})`
			}

			// Only templates the cache knows are rewritten, the rest keep working
			// as tagged calls. Nested ones are part of their outermost edit.
			const rewrites = (tagged: Tagged[]): Edit[] =>
				outermost(tagged.filter(item => sources.has(item.source))).map(item => ({
					...item,
					text: render(item.source),
				}))

			const transformedCode = new MagicString(code)

			if (svelte) {
				const { ast, components } = parseT(code, id)
				const templates = rewrites(findTaggedTemplates(ast, code))
				const lookup = (source: string, locale: string) => cache.get(source, locale)
				const edits: Edit[] = []
				let called = false

				for (const component of components) {
					const result = transformT(
						component,
						code,
						props.locales,
						lookup,
						message => this.warn(message),
						templates
					)
					edits.push(...result.edits)
					called ||= result.translated
				}

				for (const edit of edits) {
					if (edit.text === '') {
						if (edit.end > edit.start) {
							transformedCode.remove(edit.start, edit.end)
						}
					} else if (edit.start === edit.end) {
						transformedCode.appendLeft(edit.start, edit.text)
					} else {
						transformedCode.overwrite(edit.start, edit.end, edit.text)
					}
				}

				// A template inside a replaced range went with it: into the values
				// of its run, or away with a dropped <T> tag.
				for (const template of templates) {
					const covered = edits.some(
						edit => edit.start < edit.end && edit.start <= template.start && template.end <= edit.end
					)

					if (!covered) {
						transformedCode.overwrite(template.start, template.end, template.text)
					}
				}

				if (called) {
					if (ast.instance) {
						// Right after the `<script ...>` tag; a semicolon only when the
						// first statement would otherwise share the import's line.
						const { start } = ast.instance.content as unknown as { start: number }
						const first = ast.instance.content.body[0] as unknown as { start: number } | undefined
						const sameLine = !code.slice(start, first?.start ?? start).includes('\n')

						transformedCode.appendLeft(start, `${LANG_IMPORT}${sameLine ? ';\n' : ''}`)
					} else {
						transformedCode.prepend(`<script>\n\t${LANG_IMPORT}\n</script>\n`)
					}
				}
			} else {
				for (const template of rewrites(findTypescriptTagged(code))) {
					transformedCode.overwrite(template.start, template.end, template.text)
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
