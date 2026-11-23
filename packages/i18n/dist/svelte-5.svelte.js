import T from "./T.svelte";
//#region src/framework/svelte-5.svelte.ts
let locale = $state("en");
let localeSource;
const currentLocale = () => localeSource?.() ?? locale;
/** Reads the locale from the given function when it returns one, like a
* request's own locale while the server renders it.
*
* @example
* setLocaleSource(() => storage.getStore()?.locale)
*/
const setLocaleSource = (source) => {
	localeSource = source;
};
let t = $derived.by(() => {
	const api = (template, ...args) => {
		return String.raw({ raw: template.raw }, ...args);
	};
	api.get = (og, translations) => {
		return translations[currentLocale()] ?? og;
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
		return currentLocale();
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
export { T, lang, setLocaleSource };
