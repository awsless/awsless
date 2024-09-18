import OpenAI, { ClientOptions } from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { Translator } from '../vite'

export const chatgpt = (props?: ClientOptions & { rules?: string[] }): Translator => {
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
			model: 'gpt-4o-2024-08-06',
			max_tokens: 4095,
			n: 1,
			temperature: 1,
			response_format: format,
			messages: [
				{ role: 'system', content: 'You are a helpful translator.' },
				{ role: 'user', content: prompt(originalLocale, list, props?.rules) },
			],
		})

		const json = response.choices[0]?.message.content
		if (!json) {
			throw new Error('Invalid chat gpt response')
		}

		const data = JSON.parse(json)

		return data.translations
	}
}

const prompt = (originalLocale: string, list: { original: string; locale: string }[], rules?: string[]) => {
	return `You have to translate the text inside the JSON file below from ${originalLocale} to the provided locale.
${rules?.join('\n') ?? ''}

JSON FILE:
${JSON.stringify(list)}`
}
