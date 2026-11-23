import T from "./T.svelte";
//#region src/framework/svelte-5.svelte.d.ts
type StringArgs = Array<string | number | {
  toString(): string;
}>;
type Translate = {
  (template: TemplateStringsArray, ...args: StringArgs): string;
};
/** Reads the locale from the given function when it returns one, like a
 * request's own locale while the server renders it.
 *
 * @example
 * setLocaleSource(() => storage.getStore()?.locale)
 */
declare const setLocaleSource: (source: () => string | undefined) => void;
declare const lang: {
  /** Get the current locale.
   *
   * @example
   * console.log(lang.locale)
   */
  locale: string;
  /** Translate helper for translating template strings.
   * The i18n Vite plugin will find all instances where you want text
   * to be translated and automatically translate your text during build time.
   *
   * @example
   * lang.t`Hello world!`
   */
  readonly t: Translate;
};
//#endregion
export { T, lang, setLocaleSource };