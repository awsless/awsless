declare const $state: <T>(v: T) => T
declare const $derived: { by: <T>(c: () => T) => T }

type StringArgs = Array<string | number | { toString(): string }>

// The text slices of one translated run, between its expressions: the
// source's own and one list per locale. Registered once per component file.
type Run = [source: string[], translations: Record<string, string[]>]

const runs = new Map<string, Run>()

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

	api.runs = (table: Record<string, Run>) => {
		for (const [id, run] of Object.entries(table)) {
			runs.set(id, run)
		}
	}

	// The n-th text slice of a run in the active locale. The expressions in
	// between stay Svelte's own, so it schedules them as it always does.
	api.part = (id: string, index: number) => {
		const run = runs.get(id)

		return run ? ((run[1][locale] ?? run[0])[index] ?? '') : ''
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
