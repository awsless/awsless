import { build } from 'vite'
import { i18n, ai } from '../src'
import { resolve } from 'path'
import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Cache, loadCache, saveCache } from '../src/cache'
import { openai } from '@ai-sdk/openai'

describe('i18n', () => {
	process.env.OPENAI_API_KEY = ''

	it(
		'build vite with translations',
		async () => {
			await build({
				plugins: [
					i18n({
						locales: ['fr', 'jp'],
						translate: ai({
							maxOutputTokens: 32_000,
							model: openai('gpt-5'),
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
			])

			for (const translated of Object.values(entries)) {
				expect(translated).toBeTypeOf('string')
			}
		}
	})

	it('writes the cache in a stable order', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		const cache = new Cache()

		cache.set('zulu', 'jp', 'zulu-jp')
		cache.set('alpha', 'jp', 'alpha-jp')
		cache.set('alpha', 'fr', 'alpha-fr')
		cache.set('zulu', 'fr', 'zulu-fr')

		await saveCache(cwd, cache)

		const file = await readFile(resolve(cwd, 'i18n.generated.json'), 'utf8')

		expect(file).toBe(
			'{\n' +
				'  "alpha": {\n' +
				'    "fr": "alpha-fr",\n' +
				'    "jp": "alpha-jp"\n' +
				'  },\n' +
				'  "zulu": {\n' +
				'    "fr": "zulu-fr",\n' +
				'    "jp": "zulu-jp"\n' +
				'  }\n' +
				'}\n'
		)
	})

	it('prefers translations from i18n.json over i18n.generated.json', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))

		await writeFile(
			resolve(cwd, 'i18n.generated.json'),
			JSON.stringify(
				{
					greeting: {
						fr: 'bonjour-generated',
						jp: 'こんにちは-generated',
					},
				},
				undefined,
				2
			)
		)

		await writeFile(
			resolve(cwd, 'i18n.json'),
			JSON.stringify(
				{
					greeting: {
						fr: 'bonjour-override',
					},
				},
				undefined,
				2
			)
		)

		const cache = await loadCache(cwd)

		expect(cache.get('greeting', 'fr')).toBe('bonjour-override')
		expect(cache.get('greeting', 'jp')).toBe('こんにちは-generated')
	})

	// it('Skip adding translations if they are the same', async () => {
	// 	const result = await build({
	// 		plugins: [
	// 			i18n({
	// 				locales: ['fr', 'jp'],
	// 				translate: mock(),
	// 			}),
	// 			svelte(),
	// 		],
	// 		root: resolve(__dirname, './_site'),
	// 		build: {
	// 			write: false,
	// 		},
	// 	})

	// 	console.log(result)
	// })
})
