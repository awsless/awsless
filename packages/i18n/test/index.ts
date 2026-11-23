import { EventEmitter } from 'events'
import { mkdtemp, readFile, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { openai } from '@ai-sdk/openai'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { build } from 'vite'
import { i18n, ai, type I18nPluginProps, type Translator } from '../src'
import { Cache, loadCache, mergeCaches, saveCache } from '../src/cache'
import { translateProject } from '../src/command'
import { findNewTranslations, removeUnusedTranslations } from '../src/diff'
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
			const serve = (props: Omit<I18nPluginProps, 'locales' | 'translateInDev'>) => {
				const plugin = i18n({ locales: ['fr'], translateInDev: true, ...props })
				// @ts-expect-error only the hook body is exercised
				plugin.configResolved({ command: 'serve' })
				return plugin
			}

			let plugin = serve({ translate: mock('TRANSLATED') })
			const context = { info() {}, environment: { logger: { info() {} } } }

			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)

			expect((await loadCache(cwd)).get({ source: 'Hello' }, 'fr')).toBe('TRANSLATED')

			const update = (code: string) => ({ file, read: async () => code })

			// Bursts of saves must not translate the same text twice.
			const translate = vi.fn(mock('TRANSLATED'))
			plugin = serve({ translate })
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

	it('keeps the dev server running when translating fails', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		await writeFile(resolve(cwd, 'page.svelte'), '<p>{lang.t`Hello`}</p>')

		const previous = process.cwd()
		process.chdir(cwd)

		try {
			const translate = () => Promise.reject(new Error('Your credit balance is too low'))
			const warn = vi.fn()
			const context = { info() {}, warn }

			const plugin = i18n({ locales: ['fr'], translate, translateInDev: true })
			// @ts-expect-error only the hook body is exercised
			plugin.configResolved({ command: 'serve' })
			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)

			expect(warn).toHaveBeenCalledWith(expect.stringContaining('Your credit balance is too low'))

			// The text is left alone and shows in the default language.
			// @ts-expect-error only the hook body is exercised
			expect(plugin.transform.call(context, 'lang.t`Hello`').code).toBe('lang.t`Hello`')

			// A build still fails, it would ship without translations.
			const build = i18n({ locales: ['fr'], translate })
			// @ts-expect-error only the hook body is exercised
			build.configResolved({ command: 'build' })
			// @ts-expect-error only the hook body is exercised
			await expect(build.buildStart.call(context)).rejects.toThrow('Your credit balance is too low')
		} finally {
			process.chdir(previous)
		}
	})

	it('leaves translating to builds by default in dev', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		const file = resolve(cwd, 'page.svelte')
		await writeFile(file, '<p>{lang.t`Hello`}</p>')
		await writeFile(resolve(cwd, 'i18n.generated.json'), JSON.stringify({ '': { Removed: { fr: 'Supprimé' } } }))

		const previous = process.cwd()
		process.chdir(cwd)

		try {
			const translate = vi.fn(mock('TRANSLATED'))
			const context = { info() {}, warn() {}, environment: { logger: { info() {}, warn() {} } } }

			const plugin = i18n({ locales: ['fr'], translate })
			// @ts-expect-error only the hook body is exercised
			plugin.configResolved({ command: 'serve' })
			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)
			// @ts-expect-error only the hook body is exercised
			await plugin.hotUpdate.call(context, { file, read: async () => '<p>{lang.t`Goodbye`}</p>' })

			expect(translate).not.toHaveBeenCalled()

			// The cached text that's no longer used is kept.
			expect((await loadCache(cwd)).get({ source: 'Removed' }, 'fr')).toBe('Supprimé')

			// The CLI goes through the same api and does translate.
			await plugin.api!.translate(cwd, context)

			expect(translate).toHaveBeenCalledTimes(1)

			const cache = await loadCache(cwd)
			expect(cache.get({ source: 'Hello' }, 'fr')).toBe('TRANSLATED')
			expect(cache.has({ source: 'Removed' }, 'fr')).toBe(false)
		} finally {
			process.chdir(previous)
		}
	})

	it('still translates builds when translateInDev is off', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		await writeFile(resolve(cwd, 'page.svelte'), '<p>{lang.t`Hello`}</p>')
		await writeFile(resolve(cwd, 'i18n.generated.json'), JSON.stringify({ '': { Removed: { fr: 'Supprimé' } } }))

		const previous = process.cwd()
		process.chdir(cwd)

		try {
			const plugin = i18n({ locales: ['fr'], translate: mock('TRANSLATED'), translateInDev: false })
			// @ts-expect-error only the hook body is exercised
			plugin.configResolved({ command: 'build' })
			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call({ info() {}, warn() {} })

			const cache = await loadCache(cwd)
			expect(cache.get({ source: 'Hello' }, 'fr')).toBe('TRANSLATED')
			expect(cache.has({ source: 'Removed' }, 'fr')).toBe(false)
		} finally {
			process.chdir(previous)
		}
	})

	it('translates with the plugin from the vite config', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		await writeFile(resolve(cwd, 'page.svelte'), '<p>{lang.t`Hello`}</p>')

		const previous = process.cwd()
		process.chdir(cwd)

		const log = { info() {}, warn() {} }
		const config = (translate: Translator) => ({
			configFile: false as const,
			logLevel: 'silent' as const,
			plugins: [[i18n({ locales: ['fr'], translate })]],
		})

		try {
			await translateProject(config(mock('TRANSLATED')), log)
			expect((await loadCache(cwd)).get({ source: 'Hello' }, 'fr')).toBe('TRANSLATED')

			// Unlike in dev, a failed translation fails the command.
			await writeFile(resolve(cwd, 'page.svelte'), '<p>{lang.t`Goodbye`}</p>')
			const failing = () => Promise.reject(new Error('Your credit balance is too low'))
			await expect(translateProject(config(failing), log)).rejects.toThrow('Your credit balance is too low')

			await expect(translateProject({ configFile: false, logLevel: 'silent' }, log)).rejects.toThrow(
				"The awsless/i18n plugin wasn't found"
			)
		} finally {
			process.chdir(previous)
		}
	})

	it('reloads the translations when the cache files change in dev', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		await writeFile(resolve(cwd, 'page.svelte'), '<p>{lang.t`Hello`}</p>')

		const previous = process.cwd()
		process.chdir(cwd)

		try {
			const plugin = i18n({ locales: ['fr'], translate: mock('TRANSLATED') })
			const context = { info() {}, warn() {} }

			const watcher = new EventEmitter()
			const invalidateAll = vi.fn()
			const send = vi.fn()
			const server = {
				watcher,
				environments: { client: { moduleGraph: { invalidateAll } }, ssr: { moduleGraph: { invalidateAll } } },
				ws: { send },
				config: { logger: { warn() {} } },
			}

			// @ts-expect-error only the hook body is exercised
			plugin.configResolved({ command: 'serve' })
			// @ts-expect-error only the hook body is exercised
			plugin.configureServer(server)
			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)

			// @ts-expect-error only the hook body is exercised
			expect(plugin.transform.call(context, 'lang.t`Hello`').code).toBe('lang.t`Hello`')

			// The translate CLI writes the cache while the dev server runs.
			// The watcher reports real paths, the temp dir may be a symlink.
			const file = resolve(process.cwd(), 'i18n.generated.json')
			await writeFile(file, JSON.stringify({ '': { Hello: { fr: 'Bonjour' } } }))
			watcher.emit('add', file)

			await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: 'full-reload' }))
			expect(invalidateAll).toHaveBeenCalledTimes(2)

			// @ts-expect-error only the hook body is exercised
			expect(plugin.transform.call(context, 'lang.t`Hello`').code).toBe('lang.t.get(`Hello`, {"fr":`Bonjour`})')

			// A save that matches what's loaded, like our own, doesn't reload.
			watcher.emit('change', file)
			watcher.emit('change', resolve(process.cwd(), 'page.svelte'))
			await new Promise(resolve => setTimeout(resolve, 50))
			expect(send).toHaveBeenCalledTimes(1)
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

describe('cache with contexts', () => {
	it('reads the format without contexts', () => {
		const cache = new Cache({ Save: { fr: 'Sauvegarder' } })

		expect([...cache.keys()]).toStrictEqual([{ source: 'Save' }])
		expect(cache.get({ source: 'Save' }, 'fr')).toBe('Sauvegarder')
		expect(cache.toJSON()).toStrictEqual({ '': { Save: { fr: 'Sauvegarder' } } })
	})

	it('keeps the same text apart per context', () => {
		const cache = new Cache()
		cache.set({ source: 'Save' }, 'fr', 'Sauvegarder')
		cache.set({ source: 'Save', context: 'button' }, 'fr', 'Enregistrer')

		expect([...cache.keys()]).toStrictEqual([{ source: 'Save' }, { source: 'Save', context: 'button' }])
		expect([...cache.entries()]).toStrictEqual([
			{ source: 'Save', locale: 'fr', translation: 'Sauvegarder' },
			{ source: 'Save', context: 'button', locale: 'fr', translation: 'Enregistrer' },
		])
		expect(cache.has({ source: 'Save', context: 'menu' }, 'fr')).toBe(false)
	})

	it('removes empty groups on delete', () => {
		const cache = new Cache()
		cache.set({ source: 'Save', context: 'button' }, 'fr', 'Enregistrer')
		cache.set({ source: 'Save', context: 'button' }, 'jp', '保存')

		cache.delete({ source: 'Save', context: 'button' }, 'fr')
		expect(cache.toJSON()).toStrictEqual({ button: { Save: { jp: '保存' } } })

		cache.delete({ source: 'Save', context: 'button' }, 'jp')
		cache.delete({ source: 'missing' }, 'jp')
		expect(cache.toJSON()).toStrictEqual({})
	})

	it('merges per context, later caches win', () => {
		const generated = new Cache()
		generated.set({ source: 'Save' }, 'fr', 'generated')
		generated.set({ source: 'Save', context: 'button' }, 'fr', 'generated-button')

		const override = new Cache()
		override.set({ source: 'Save', context: 'button' }, 'fr', 'override-button')

		const merged = mergeCaches(generated, override)
		expect(merged.get({ source: 'Save' }, 'fr')).toBe('generated')
		expect(merged.get({ source: 'Save', context: 'button' }, 'fr')).toBe('override-button')
	})

	it('asks for the missing context and cleans up the unused one', () => {
		const cache = new Cache()
		cache.set({ source: 'Save' }, 'fr', 'Sauvegarder')
		cache.set({ source: 'Save', context: 'old' }, 'fr', 'stale')

		const used = [{ source: 'Save' }, { source: 'Save', context: 'button' }]

		expect(findNewTranslations(cache, used, ['fr'])).toStrictEqual([
			{ source: 'Save', context: 'button', locale: 'fr' },
		])

		removeUnusedTranslations(cache, used, ['fr'])
		expect(cache.toJSON()).toStrictEqual({ '': { Save: { fr: 'Sauvegarder' } } })
	})

	it('translates a <T> with a context saved during dev', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		const file = resolve(cwd, 'page.svelte')
		await writeFile(file, '<T context="menu">Open</T>')

		const previous = process.cwd()
		process.chdir(cwd)

		try {
			const plugin = i18n({ locales: ['fr'], translate: mock('TRANSLATED'), translateInDev: true })
			const context = { info() {}, warn() {}, environment: { logger: { info() {}, warn() {} } } }

			// @ts-expect-error only the hook body is exercised
			plugin.configResolved({ command: 'serve' })
			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)
			expect((await loadCache(cwd)).get({ source: 'Open', context: 'menu' }, 'fr')).toBe('TRANSLATED')

			// @ts-expect-error only the hook body is exercised
			await plugin.hotUpdate.call(context, { file, read: async () => '<T context="menu">Open</T> <T>Open</T>' })

			const cache = await loadCache(cwd)
			expect(cache.get({ source: 'Open' }, 'fr')).toBe('TRANSLATED')
			expect(cache.get({ source: 'Open', context: 'menu' }, 'fr')).toBe('TRANSLATED')

			// A file that doesn't parse is left to the svelte plugin
			// @ts-expect-error only the hook body is exercised
			const broken = plugin.transform.call(context, '<T>oops', file)
			expect(broken.code).toBe('<T>oops')
		} finally {
			process.chdir(previous)
		}
	})
})
