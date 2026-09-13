//#region src/framework/svelte-5.svelte.ts
let locale = $state("en");
let t = $derived.by(() => {
	const api = (template, ...args) => {
		return String.raw({ raw: template.raw }, ...args);
	};
	api.get = (og, translations) => {
		return translations[locale] ?? og;
	};
	api.pick = (source, translations, values = []) => {
		let result = "";
		for (const part of translations[locale] ?? source) result += typeof part === "number" ? values[part] == null ? "" : String(values[part]) : part;
		return result;
	};
	return api;
});
const lang = {
	/** Get the current locale.
	*
	* @example
	* console.log(lang.locale)
	*/
	get locale() {
		return locale;
	},
	/** To change the locale that is being rendered simply change this property.
	*
	* @example
	* lang.locale = 'jp'
	*/
	set locale(v) {
		locale = v;
	},
	/** Translate helper for translating template strings.
	* The i18n Vite plugin will find all instances where you want text
	* to be translated and automatically translate your text during build time.
	*
	* @example
	* lang.t`Hello world!`
	*/
	get t() {
		return t;
	}
};
//#endregion
export { lang };
