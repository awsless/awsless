declare const $state: <T>(v: T) => T
declare const $derived: { by: <T>(c: () => T) => T }

type StringArgs = Array<string | number | { toString(): string }>

type Translate = {
	(template: TemplateStringsArray, ...args: StringArgs): string
}

let locale = $state('en')

// A server renders many requests at once, each in its own locale, so it
// hands over a lookup for the current request's.
let localeSource: (() => string | undefined) | undefined

const currentLocale = () => localeSource?.() ?? locale

/** Reads the locale from the given function when it returns one, like a
 * request's own locale while the server renders it.
 *
 * @example
 * setLocaleSource(() => storage.getStore()?.locale)
 */
export const setLocaleSource = (source: () => string | undefined) => {
	localeSource = source
}

let t: Translate = $derived.by(() => {
	const api = (template: TemplateStringsArray, ...args: StringArgs) => {
		return String.raw({ raw: template.raw }, ...args)
	}

	api.get = (og: string, translations: Record<string, string>) => {
		return translations[currentLocale()] ?? og
	}

	return api
})

export const lang = {
	/** Get the current locale.
	 *
	 * @example
	 * console.log(lang.locale)
	 */
	get locale() {
		return currentLocale()
	},
	/** To change the locale that is being rendered simply change this property.
	 *
	 * @example
	 * lang.locale = 'jp'
	 */
	set locale(v) {
		locale = v
	},
	/** Translate helper for translating template strings.
	 * The i18n Vite plugin will find all instances where you want text
	 * to be translated and automatically translate your text during build time.
	 *
	 * @example
	 * lang.t`Hello world!`
	 */
	get t() {
		return t
	},
}

export { default as T } from './T.svelte'
