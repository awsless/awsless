export const locale = $state('en')

export const $t = $derived.by(() => {
	const api = (template: TemplateStringsArray, ...args: Array<string | number>) => {
		return String.raw({ raw: template.raw }, ...args)
	}

	api.get = (og: string, translations: Record<string, string>) => {
		return translations[locale] ?? og
	}

	return api
})
