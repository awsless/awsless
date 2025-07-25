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
    readonly t: (template: TemplateStringsArray, ...args: Array<string | number | {
        toString(): string;
    }>) => string;
};

export { lang };
