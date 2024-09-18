import * as svelte_store from 'svelte/store';

declare const locale: svelte_store.Writable<string>;
declare const t: svelte_store.Readable<{
    (template: TemplateStringsArray, ...args: Array<string | number>): string;
    get(og: string, translations: Record<string, string>): string;
}>;

export { locale, t };
