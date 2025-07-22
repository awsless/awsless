import { build } from 'vite'
import { i18n, ai } from '../src'
import { resolve } from 'path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { loadCache } from '../src/cache'
import { openai } from '@ai-sdk/openai'

describe('i18n', () => {
	process.env.OPENAI_API_KEY = ''

	it(
		'build vite with translations',
		async () => {
			await build({
				plugins: [
					i18n({
						locales: ['fr', 'jp', 'nl'],
						translate: ai({
							maxTokens: 32_000,
							model: openai.chat('gpt-4.1'),
						}),
					}),
					svelte(),
				],
				root: resolve(__dirname, './_site'),
				build: {
					write: false,
				},
			})
		},
		60 * 1000
	)

	it('check all translations', async () => {
		const cache = await loadCache(process.cwd())
		const result = cache.toJSON()

		const sourceTexts = Object.keys(result)
		const translatedTexts = Object.values(result)

		expect(sourceTexts.sort()).toStrictEqual([
			'',
			'Hello ${1} world',
			'Loading...',
			"Right now it's ${new Date()}.",
			'Title',
			'head',
			'test',
			'the count is ${num}',
			'the number is ${1}',
		])

		for (const entries of translatedTexts) {
			expect(Object.keys(entries)).toStrictEqual([
				//
				'fr',
				'jp',
				'nl',
			])

			for (const translated of Object.values(entries)) {
				expect(translated).toBeTypeOf('string')
			}
		}
	})
})
