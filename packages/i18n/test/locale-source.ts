import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { stripTypeScriptTypes } from 'module'
import { resolve } from 'path'
import { compileModule } from 'svelte/compiler'

describe('setLocaleSource', () => {
	let dir: string
	let runtime: typeof import('../src/framework/svelte-5.svelte')

	beforeAll(async () => {
		// Inside the package, so the compiled module resolves svelte.
		dir = await mkdtemp(resolve(__dirname, '../.locale-source-'))
		const source = await readFile(resolve(__dirname, '../src/framework/svelte-5.svelte.ts'), 'utf8')
		const runes = stripTypeScriptTypes(source.replace(/^export \{ default as T \}.*$/m, ''))
		const { js } = compileModule(runes, {
			generate: 'server',
			filename: 'svelte-5.svelte.ts',
		})
		await writeFile(resolve(dir, 'runtime.js'), js.code)
		runtime = await import(resolve(dir, 'runtime.js'))
	})

	afterAll(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	it('renders in the locale of the source, and the set locale without one', () => {
		const { lang, setLocaleSource } = runtime
		const translations = { fr: 'Bonjour', jp: 'こんにちは' }
		let current: string | undefined = 'jp'

		lang.locale = 'fr'
		expect(lang.t.get('Hello', translations)).toBe('Bonjour')

		setLocaleSource(() => current)
		expect(lang.locale).toBe('jp')
		expect(lang.t.get('Hello', translations)).toBe('こんにちは')

		current = undefined
		expect(lang.locale).toBe('fr')
	})
})
