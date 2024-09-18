import { build } from 'vite'
import { createI18nPlugin } from '../src/vite'
import { resolve } from 'path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { chatgpt } from '../src/translate/chat-gpt'
import { loadCache } from '../src/cache'

describe('i18n', () => {
	it(
		'build vite with translations',
		async () => {
			await build({
				plugins: [
					createI18nPlugin({
						locales: ['fr', 'jp', 'nl'],
						translate: chatgpt(),
					}),
					svelte(),
				],
				root: resolve(__dirname, './_site'),
				build: {
					write: false,
				},
			})
		},
		20 * 1000
	)

	it('check all translations', async () => {
		const cache = await loadCache(process.cwd())
		const result = cache.toJSON()

		expect(Object.keys(result)).toStrictEqual([
			'head',
			'test',
			'the count is ${num}',
			'the number is ${1}',
			'Loading...',
			'Title',
			'Hello ${1} world',
		])

		expect(Object.keys(Object.values(result)[0]!)).toStrictEqual([
			//
			'fr',
			'jp',
			'nl',
		])
	})
})
