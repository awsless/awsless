import { derived, writable } from 'svelte/store'

export const locale = writable('en')

export const t = derived([locale], ([locale]) => {
	const api = (template: TemplateStringsArray, ...args: Array<string | number>) => {
		return String.raw({ raw: template.raw }, ...args)
	}

	api.get = (og: string, translations: Record<string, string>) => {
		return translations[locale] ?? og
	}

	return api
})

// export const fallbackLocale = $state('en')
// export const locale = $state('en')

// export const t = $derived(([locale, fallbackLocale]) => {
// 	const api = (template: TemplateStringsArray, ...args: Array<string | number>) => {
// 		return String.raw({ raw: template.raw }, ...args)
// 	}

// 	api.get = (translations: Record<string, string>) => {
// 		return translations[locale] ?? translations[fallbackLocale] ?? ''
// 	}

// 	return api
// })
