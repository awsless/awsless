import { generateObject, LanguageModel } from 'ai'
import chunk from 'chunk'
import { z } from 'zod'
import { TranslationResponse, Translator } from '../vite'

export type AiTranslationProps = {
	/** The maximum number of output tokens allowed in the AI's response. */
	maxOutputTokens: number

	/** The language model to use for translations (e.g., gpt-4, gpt-3.5-turbo). */
	model: LanguageModel

	/** Number of text entries to translate in a single batch.
	 * @default 1000
	 */
	batchSize?: number

	/** Custom translation guidelines for the AI. These are injected into the prompt. */
	rules?: string[]
}

type Request = Parameters<Translator>[1][number]

export const ai = (props: AiTranslationProps): Translator => {
	return async (originalLocale, texts) => {
		const batches = chunk(texts, props.batchSize ?? 1000)

		const translations = await Promise.all(
			batches.map(async batch => {
				const result = await generateObject({
					model: props.model,
					maxOutputTokens: props.maxOutputTokens,
					schema: z.object({
						translations: z
							.object({
								id: z.number(),
								translation: z.string(),
							})
							.array(),
					}),
					prompt: [
						`You have to translate the text inside the JSON file below from "${originalLocale}" to the provided locale.`,
						'Return the id of every entry together with its translation.',
						'Some texts contain tags like <b>...</b> or <Link_1>...</Link_1> and placeholders like {count} or ${name}.',
						'Keep every tag and placeholder exactly as written, but move them when the grammar of the target language needs it.',
						'Never translate, add, remove, or rename a tag or placeholder.',
						'A "context" field describes where the text is used. Use it to pick the right wording, but never translate it.',
						...(props?.rules ?? []),
						'',
						`JSON FILE:`,
						JSON.stringify(batch.map((item, id) => ({ id, ...item }))),
					].join('\n'),
					system: 'You are a helpful translator.',
				})

				return matchTranslations(batch, result.object.translations)
			})
		)

		return translations.flat()
	}
}

// The model echoes an id instead of the source text, so a slightly
// altered echo can't miss the cache and the context always comes back.
export const matchTranslations = (requests: Request[], responses: { id: number; translation: string }[]) => {
	const list: TranslationResponse[] = []

	for (const { id, translation } of responses) {
		const request = requests[id]

		if (request) {
			list.push({ ...request, translation })
		}
	}

	return list
}
