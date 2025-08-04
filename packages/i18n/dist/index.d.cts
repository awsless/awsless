import { Plugin } from 'vite';
import { LanguageModel } from 'ai';

type Translator = (defaultLocale: string, list: {
    source: string;
    locale: string;
}[]) => TranslationResponse[] | Promise<TranslationResponse[]>;
type TranslationResponse = {
    source: string;
    locale: string;
    translation: string;
};
type I18nPluginProps = {
    /** The original language your source text is written in.
     * @default "en"
     */
    default?: string;
    /** The list of target locales to translate your text into. */
    locales: string[];
    /** Function that performs the translation of a given text. */
    translate: Translator;
};
declare const i18n: (props: I18nPluginProps) => Plugin;

type AiTranslationProps = {
    /** The maximum number of tokens allowed in the AI's response. */
    maxTokens: number;
    /** The language model to use for translations (e.g., gpt-4, gpt-3.5-turbo). */
    model: LanguageModel;
    /** Number of text entries to translate in a single batch.
     * @default 1000
     */
    batchSize?: number;
    /** Custom translation guidelines for the AI. These are injected into the prompt. */
    rules?: string[];
};
declare const ai: (props: AiTranslationProps) => Translator;

export { type AiTranslationProps, type I18nPluginProps, type Translator, ai, i18n };
