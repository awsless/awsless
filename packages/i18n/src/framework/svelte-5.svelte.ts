declare const $state: <T>(v: T) => T
declare const $derived: { by: <T>(c: () => T) => T }

type StringArgs = Array<string | number | { toString(): string }>

// Text, or the position of a value. Values arrive evaluated and stringified,
// so a translation can reorder them without running an expression twice.
type Part = string | number

type Translate = {
	(template: TemplateStringsArray, ...args: StringArgs): string
}

let locale = $state('en')

let t: Translate = $derived.by(() => {
	const api = (template: TemplateStringsArray, ...args: StringArgs) => {
		return String.raw({ raw: template.raw }, ...args)
	}

	api.get = (og: string, translations: Record<string, string>) => {
		return translations[locale] ?? og
	}

	// Coerces like Svelte does for `{value}`: nullish is empty, symbols stringify.
	api.str = (value: unknown) => (value == null ? '' : String(value))

	// Values arrive as strings already, so reordering them is safe.
	api.pick = (source: Part[], translations: Record<string, Part[]>, values: string[] = []) => {
		let result = ''

		for (const part of translations[locale] ?? source) {
			result += typeof part === 'number' ? (values[part] ?? '') : part
		}

		return result
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
