import { Plugin } from 'vite';
import { ClientOptions } from 'openai';

type Translator = (defaultLocale: string, list: {
    original: string;
    locale: string;
}[]) => TranslationResponse[] | Promise<TranslationResponse[]>;
type TranslationResponse = {
    original: string;
    locale: string;
    translation: string;
};
type I18nPluginProps = {
    /** The default locale that your original text is writen in. */
    default?: string;
    /** A list of locales that you want your text translated too. */
    locales: string[];
    /** The callback that is responsible for translating the text. */
    translate: (defaultLocale: string, list: {
        original: string;
        locale: string;
    }[]) => TranslationResponse[] | Promise<TranslationResponse[]>;
};
declare const createI18nPlugin: (props: I18nPluginProps) => Plugin[];

type ChatgptProps = ClientOptions & {
    /** The maximum number of tokens that can be generated in the chat completion. */
    maxTokens?: number;
    /** ID of the model to use. */
    model?: string;
    /** The rules that chatgpt should follow. It will be added to the prompt. */
    rules?: string[];
};
declare const chatgpt: (props?: ChatgptProps) => Translator;

declare const mock: (translation?: string) => Translator;

export { chatgpt, createI18nPlugin as i18n, mock };
