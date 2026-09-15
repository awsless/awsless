import { mkdtemp, readFile, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { openai } from '@ai-sdk/openai'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { build } from 'vite'
import { i18n, ai } from '../src'
import { Cache, loadCache, saveCache } from '../src/cache'
import { mock } from '../src/translate/mock'

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
		const result = cache.toJSON()['']!

		const sourceTexts = Object.keys(result)
		const translatedTexts = Object.values(result)

		expect(sourceTexts.toSorted()).toStrictEqual([
			'',
			'Hello ${1} world',
			'Loading...',
			"Right now it's ${new Date()}.",
			'Title',
			'You have <b>{num}</b> new <a>messages</a>.',
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

		cache.set({ source: 'zulu' }, 'jp', 'zulu-jp')
		cache.set({ source: 'alpha' }, 'jp', 'alpha-jp')
		cache.set({ source: 'alpha' }, 'fr', 'alpha-fr')
		cache.set({ source: 'zulu' }, 'fr', 'zulu-fr')
		cache.set({ source: 'alpha', context: 'menu' }, 'fr', 'alpha-menu-fr')

		await saveCache(cwd, cache)

		const file = await readFile(resolve(cwd, 'i18n.generated.json'), 'utf8')

		expect(file).toBe(
			'{\n' +
				'\t"": {\n' +
				'\t\t"alpha": {\n' +
				'\t\t\t"fr": "alpha-fr",\n' +
				'\t\t\t"jp": "alpha-jp"\n' +
				'\t\t},\n' +
				'\t\t"zulu": {\n' +
				'\t\t\t"fr": "zulu-fr",\n' +
				'\t\t\t"jp": "zulu-jp"\n' +
				'\t\t}\n' +
				'\t},\n' +
				'\t"menu": {\n' +
				'\t\t"alpha": {\n' +
				'\t\t\t"fr": "alpha-menu-fr"\n' +
				'\t\t}\n' +
				'\t}\n' +
				'}\n'
		)
	})

	it('leaves the cache file alone when nothing changed', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		const cache = new Cache()
		cache.set({ source: 'alpha' }, 'fr', 'alpha-fr')

		expect(await saveCache(cwd, cache)).toBe(true)
		const { mtimeMs } = await stat(resolve(cwd, 'i18n.generated.json'))

		expect(await saveCache(cwd, cache)).toBe(false)
		expect((await stat(resolve(cwd, 'i18n.generated.json'))).mtimeMs).toBe(mtimeMs)

		cache.set({ source: 'alpha' }, 'jp', 'alpha-jp')
		expect(await saveCache(cwd, cache)).toBe(true)
	})

	it('translates texts added while the dev server runs', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		const file = resolve(cwd, 'page.svelte')
		await writeFile(file, '<p>{lang.t`Hello`}</p>')

		const previous = process.cwd()
		process.chdir(cwd)

		try {
			let plugin = i18n({ locales: ['fr'], translate: mock('TRANSLATED') })
			const context = { info() {}, environment: { logger: { info() {} } } }

			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)

			expect((await loadCache(cwd)).get({ source: 'Hello' }, 'fr')).toBe('TRANSLATED')

			const update = (code: string) => ({ file, read: async () => code })

			// Bursts of saves must not translate the same text twice.
			const translate = vi.fn(mock('TRANSLATED'))
			plugin = i18n({ locales: ['fr'], translate })
			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)
			await Promise.all([
				// @ts-expect-error only the hook body is exercised
				plugin.hotUpdate.call(context, update('<p>{lang.t`Hello`} {lang.t`Goodbye`}</p>')),
				// @ts-expect-error only the hook body is exercised
				plugin.hotUpdate.call(context, update('<p>{lang.t`Goodbye`}</p>')),
			])

			expect(translate).toHaveBeenCalledTimes(1)

			const cache = await loadCache(cwd)
			expect(cache.get({ source: 'Goodbye' }, 'fr')).toBe('TRANSLATED')
			expect(cache.get({ source: 'Hello' }, 'fr')).toBe('TRANSLATED')

			// @ts-expect-error only the hook body is exercised
			const transformed = plugin.transform.call(context, 'lang.t`Goodbye`')
			expect(transformed.code).toBe('lang.t.get(`Goodbye`, {"fr":`TRANSLATED`})')
		} finally {
			process.chdir(previous)
		}
	})

	it('prefers translations from i18n.json over i18n.generated.json', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))

		await writeFile(
			resolve(cwd, 'i18n.generated.json'),
			JSON.stringify(
				{
					'': {
						greeting: {
							fr: 'bonjour-generated',
							jp: 'こんにちは-generated',
						},
					},
					menu: {
						greeting: {
							fr: 'bonjour-menu',
						},
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

		// The override file is still in the format without contexts
		expect(cache.get({ source: 'greeting' }, 'fr')).toBe('bonjour-override')
		expect(cache.get({ source: 'greeting' }, 'jp')).toBe('こんにちは-generated')
		expect(cache.get({ source: 'greeting', context: 'menu' }, 'fr')).toBe('bonjour-menu')
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
