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
    default?: string;
    locales: string[];
    translate: (defaultLocale: string, list: {
        original: string;
        locale: string;
    }[]) => TranslationResponse[] | Promise<TranslationResponse[]>;
};
declare const createI18nPlugin: (props: I18nPluginProps) => Plugin[];

declare const chatgpt: (props?: ClientOptions & {
    rules?: string[];
}) => Translator;

declare const mock: (translation?: string) => Translator;

export { chatgpt, createI18nPlugin as i18n, mock };
