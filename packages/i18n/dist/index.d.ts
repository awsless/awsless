import { LanguageModel } from "ai";
import { Plugin } from "vite";
//#region src/vite.d.ts
type Translator = (defaultLocale: string, list: {
  source: string;
  locale: string;
  /** A hint about where the text is used, from the context attribute of a <T>. */
  context?: string;
}[]) => TranslationResponse[] | Promise<TranslationResponse[]>;
type TranslationResponse = {
  source: string;
  locale: string;
  /** Must be echoed from the request, it's part of the translation key. */
  context?: string;
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
  /** Translate new texts while the dev server runs. When off, dev only uses
   * the translations already cached and builds still translate everything.
   * Run `translate` to translate without building.
   * @default false
   */
  translateInDev?: boolean;
};
type I18nPluginApi = {
  /** Finds every translatable text under `cwd`, translates the missing ones
   * and drops the unused ones from the generated cache. */
  translate(cwd: string, log: Logger): Promise<void>;
};
type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};
declare const i18n: (props: I18nPluginProps) => Plugin<I18nPluginApi>;
//#endregion
//#region src/translate/ai.d.ts
type AiTranslationProps = {
  /** The maximum number of output tokens allowed in the AI's response. */
  maxOutputTokens: number;
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
//#endregion
export { type AiTranslationProps, type I18nPluginApi, type I18nPluginProps, type Translator, ai, i18n };