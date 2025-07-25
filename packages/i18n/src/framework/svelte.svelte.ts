declare const $state: <T>(v: T) => T
declare const $derived: { by: <T>(c: () => T) => T }

let locale: string = $state('en')

let t: {
	(template: TemplateStringsArray, ...args: Array<string | number | { toString(): string }>): string
} = $derived.by(() => {
	const api = (template: TemplateStringsArray, ...args: Array<string | number | { toString(): string }>) => {
		return String.raw({ raw: template.raw }, ...args)
	}

	api.get = (og: string, translations: Record<string, string>) => {
		return translations[locale] ?? og
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
		return locale
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
