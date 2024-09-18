import OpenAI, { ClientOptions } from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { TranslationResponse, Translator } from '../vite'

export type ChatgptProps = ClientOptions & {
	/** The maximum number of tokens that can be generated in the chat completion. */
	maxTokens?: number

	/** ID of the model to use. */
	model?: string

	/** The rules that chatgpt should follow. It will be added to the prompt. */
	rules?: string[]
}

export const chatgpt = (props?: ChatgptProps): Translator => {
	const format = zodResponseFormat(
		z.object({
			translations: z
				.object({
					original: z.string(),
					locale: z.string(),
					translation: z.string(),
				})
				.array(),
		}),
		'final_schema'
	)

	return async (originalLocale, list) => {
		const client = new OpenAI(props)

		const response = await client.chat.completions.create({
			model: props?.model ?? 'gpt-4o-2024-08-06',
			max_tokens: props?.maxTokens ?? 4095,
			response_format: format,
			messages: [
				{ role: 'system', content: 'You are a helpful translator.' },
				{ role: 'user', content: prompt(originalLocale, list, props?.rules) },
			],
		})

		const json = response.choices[0]?.message.content
		if (typeof json !== 'string') {
			throw new Error('Invalid chat gpt response')
		}

		let data: { translations: TranslationResponse[] }

		try {
			data = JSON.parse(json)
		} catch (error) {
			throw new Error(`Invalid chat gpt json response: ${json}`)
		}

		return data.translations
	}
}

const prompt = (originalLocale: string, list: { original: string; locale: string }[], rules?: string[]) => {
	return `You have to translate the text inside the JSON file below from "${originalLocale}" to the provided locale.
${rules?.join('\n') ?? ''}

JSON FILE:
${JSON.stringify(list)}`
}
