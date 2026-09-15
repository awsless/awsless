import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import { i18n, Translator } from '../src'
import { Cache } from '../src/cache'
import { rewriteComponent } from '../src/component'
import { parseSvelte } from '../src/find/svelte'

const page = `<script>
	import { lang, T } from '@awsless/i18n/svelte'
	import Link from './link.svelte'
	let { user, count, hint = 'x' } = $props()
</script>

<p>
	<T>
		Hello <b class="name">{user.name}</b>, you have
		<Link href="/inbox">{count} new messages</Link>. <!-- ignored -->
	</T>
</p>
<T context="button label">Save {lang.t\`now\`}</T>
<T>Save {lang.t\`now\`}</T>
<T>line<br />break</T>
<T>{#if count}{count}{/if}</T>
<T><T>nested</T></T>
<T></T>
<T class="x">styled</T>
<T context={hint}>dynamic</T>
`

const translations: Record<string, Record<string, string>> = {
	'Hello <b>{user.name}</b>, you have <Link>{count} new messages</Link>.': {
		fr: 'Bonjour <b>{user.name}</b>, vous avez <Link>{count} nouveaux messages</Link>.',
		jp: '<b>{user.name}</b>さん、<Link>新着メッセージが{count}件</Link>あります。',
	},
	// The jp translation drops the placeholder & must be rejected
	'Save {lang.t`now`}': { fr: 'Sauvegarder {lang.t`now`}', jp: 'Enregistrer' },
	'button label\nSave {lang.t`now`}': { fr: 'Enregistrer {lang.t`now`}', jp: 'Enregistrer' },
	'line<br/>break': { fr: 'ligne<br/>saut', jp: 'line<br/>break' },
	now: { fr: 'maintenant', jp: '今' },
}

const translate: Translator = (_, list) => {
	return list.map(({ source, locale, context }) => {
		const key = context ? `${context}\n${source}` : source
		return { source, locale, context, translation: translations[key]?.[locale] ?? source }
	})
}

describe('<T> component', () => {
	it('extracts the text and markup of every <T>', () => {
		const { templates, components } = parseSvelte(page)

		expect(templates).toStrictEqual(['now', 'now'])
		expect(components.map(match => match.error ?? match.source)).toStrictEqual([
			'Hello <b>{user.name}</b>, you have <Link>{count} new messages</Link>.',
			'Save {lang.t`now`}',
			'Save {lang.t`now`}',
			'line<br/>break',
			'{#if} is not supported inside <T>',
			'nested <T> components are not supported',
			// The inner one works on its own
			'nested',
			'',
			'<T> only supports the context attribute',
			'the context of a <T> must be plain text',
		])
		expect(components[1]!.context).toBe('button label')
		expect(components[2]!.context).toBeUndefined()

		expect(components[0]!.snippets).toStrictEqual([
			'<b class="name">{@render c()}</b>',
			'{user.name}',
			'<Link href="/inbox">{@render c()}</Link>',
			'{count}',
		])
		expect(components[3]!.snippets).toStrictEqual(['<br />'])
	})

	it('gives repeated tags a suffix but shares identical placeholders', () => {
		const { components } = parseSvelte(
			'<T><a href="/a">{n}</a> or <a href="/b">{n}</a> or {fn({ n })} {fn({ m })}</T>'
		)

		expect(components[0]!.source).toBe('<a_1>{n}</a_1> or <a_2>{n}</a_2> or {expr_1} {expr_2}')
	})

	it('rewrites a <T> into a tree per locale and a snippet per node', () => {
		const cache = new Cache()
		cache.set({ source: 'Save' }, 'fr', 'Enregistrer')
		cache.set({ source: 'Save' }, 'jp', 'Save')

		const match = parseSvelte('<T>Save</T>').components[0]!
		const warn = vi.fn()

		expect(rewriteComponent(match as never, ['fr', 'jp'], cache, code => code, warn)).toBe(
			'<T tree={{"src":["Save"],"fr":["Enregistrer"]}}></T>'
		)
		expect(warn).not.toHaveBeenCalled()
	})

	it('skips a translation that broke the markup', () => {
		const cache = new Cache()
		cache.set({ source: 'a <b>b</b>' }, 'fr', 'a b')

		const match = parseSvelte('<T>a <b>b</b></T>').components[0]!
		const warn = vi.fn()

		expect(rewriteComponent(match as never, ['fr'], cache, code => code, warn)).toBe(
			'<T tree={{"src":["a ",[0,["b"]]]}}>{#snippet n0(c)}<b>{@render c()}</b>{/snippet}</T>'
		)
		expect(warn).toHaveBeenCalledWith('Skipped the "fr" translation of "a <b>b</b>": <b> is missing')
	})

	it('decodes entities in the rendered text', () => {
		const match = parseSvelte('<T>a &lt; b &amp; c&#39;s &#x41;</T>').components[0]!

		expect(match.source).toBe('a &lt; b &amp; c&#39;s &#x41;')
		expect(
			rewriteComponent(
				match as never,
				[],
				new Cache(),
				code => code,
				() => {}
			)
		).toBe('<T tree={{"src":["a < b & c\'s A"]}}></T>')
	})

	it('translates and renders a page', async () => {
		const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-'))
		await writeFile(resolve(cwd, 'page.svelte'), page)

		const previous = process.cwd()
		process.chdir(cwd)

		let code: string
		const warn = vi.fn()

		try {
			const plugin = i18n({ locales: ['fr', 'jp'], translate })
			const context = { info() {}, warn, environment: { logger: { info() {}, warn } } }

			// @ts-expect-error only the hook body is exercised
			await plugin.buildStart.call(context)
			// @ts-expect-error only the hook body is exercised
			code = plugin.transform.call(context, page, resolve(cwd, 'page.svelte')).code
		} finally {
			process.chdir(previous)
		}

		const expectedWarnings = [
			'Skipped the "jp" translation of "Save {lang.t`now`}": {lang.t`now`} is missing',
			'Skipped the "jp" translation of "Save {lang.t`now`}": {lang.t`now`} is missing',
			'nested <T> components are not supported (' + resolve(cwd, 'page.svelte') + ')',
			'{#if} is not supported inside <T> (' + resolve(cwd, 'page.svelte') + ')',
			'<T> only supports the context attribute (' + resolve(cwd, 'page.svelte') + ')',
			'the context of a <T> must be plain text (' + resolve(cwd, 'page.svelte') + ')',
		]

		expect(warn.mock.calls.flat().toSorted((a, b) => a.localeCompare(b))).toStrictEqual(
			expectedWarnings.toSorted((a, b) => a.localeCompare(b))
		)

		// The context picks its own translation & is dropped from the output
		expect(code).not.toContain('context="button label"')
		expect(code).toContain(
			'<T tree={{"src":["Save ",[0]],"fr":["Enregistrer ",[0]]}}>' +
				'{#snippet n0()}{lang.t.get(`now`, {"fr":`maintenant`,"jp":`今`})}{/snippet}</T>\n' +
				'<T tree={{"src":["Save ",[0]],"fr":["Sauvegarder ",[0]]}}>'
		)

		expect(code).toContain(
			'<T tree={{"src":["Hello ",[0,[[1]]],", you have ",[2,[[3]," new messages"]],"."],' +
				'"fr":["Bonjour ",[0,[[1]]],", vous avez ",[2,[[3]," nouveaux messages"]],"."],' +
				'"jp":[[0,[[1]]],"さん、",[2,["新着メッセージが",[3],"件"]],"あります。"]}}>' +
				'{#snippet n0(c)}<b class="name">{@render c()}</b>{/snippet}' +
				'{#snippet n1()}{user.name}{/snippet}' +
				'{#snippet n2(c)}<Link href="/inbox">{@render c()}</Link>{/snippet}' +
				'{#snippet n3()}{count}{/snippet}</T>'
		)

		expect(code).toContain(
			'<T tree={{"src":["line",[0],"break"],"fr":["ligne",[0],"saut"]}}>{#snippet n0()}<br />{/snippet}</T>'
		)

		// Unsupported ones are left alone
		expect(code).toContain('<T>{#if count}{count}{/if}</T>')
		expect(code).toContain('<T><T tree={{"src":["nested"]}}></T></T>')
		expect(code).toContain('<T></T>')

		const html = await ssr(code)

		expect(await html('en')).toBe(
			'<p>Hello <b class="name">Ivan</b>, you have <a href="/inbox">3 new messages</a>.</p> ' +
				'Save now Save now line<br/>break 3 nested  styled dynamic'
		)
		expect(await html('fr')).toBe(
			'<p>Bonjour <b class="name">Ivan</b>, vous avez <a href="/inbox">3 nouveaux messages</a>.</p> ' +
				'Enregistrer maintenant Sauvegarder maintenant ligne<br/>saut 3 nested  styled dynamic'
		)
		expect(await html('jp')).toBe(
			'<p><b class="name">Ivan</b>さん、<a href="/inbox">新着メッセージが3件</a>あります。</p> ' +
				'Save 今 Save 今 line<br/>break 3 nested  styled dynamic'
		)
	})
})

// Compiles the transformed page for the server, together with the T
// component and a stand-in lang module, and renders it per locale.
const ssr = async (page: string) => {
	const dir = resolve(__dirname, '_tmp', String(Date.now()))
	await mkdir(dir, { recursive: true })

	const T = await import('fs/promises').then(fs =>
		fs.readFile(resolve(__dirname, '../src/framework/T.svelte'), 'utf8')
	)

	const files: Record<string, string> = {
		'lang.js': `export const lang = { locale: 'en', t: Object.assign(() => '', { get: (og, all) => all[lang.locale] ?? og }) }
lang.t = (template, ...args) => String.raw({ raw: template.raw }, ...args)
lang.t.get = (og, all) => all[lang.locale] ?? og`,
		'link.js': compile('<script>let { href, children } = $props()</script><a {href}>{@render children()}</a>', {
			generate: 'server',
			filename: 'link.svelte',
		}).js.code,
		'T.js': compile(T, { generate: 'server', filename: 'T.svelte' }).js.code.replace(
			"'./svelte-5.svelte'",
			"'./lang.js'"
		),
		'page.js': compile(page, { generate: 'server', filename: 'page.svelte' })
			.js.code.replace("'@awsless/i18n/svelte'", "'./lang.js'")
			.replace("'./link.svelte'", "'./link.js'"),
	}

	// The compiled page imports T from the lang module
	files['lang.js'] += `\nexport { default as T } from './T.js'`

	for (const [name, content] of Object.entries(files)) {
		await writeFile(resolve(dir, name), content)
	}

	const { lang } = await import(resolve(dir, 'lang.js'))
	const { default: Page } = await import(resolve(dir, 'page.js'))

	return async (locale: string) => {
		lang.locale = locale
		const { body } = render(Page, { props: { user: { name: 'Ivan' }, count: 3 } })
		await rm(resolve(__dirname, '_tmp'), { recursive: true, force: true })
		return body.replace(/<!--.*?-->/g, '')
	}
}

describe('context', () => {
	it('keeps texts with different contexts apart', async () => {
		const { dedupe } = await import('../src/find')

		expect(
			dedupe([
				{ source: 'Save' },
				{ source: 'Save', context: 'button' },
				{ source: 'Save', context: 'the verb' },
				{ source: 'Save', context: 'button' },
				{ source: 'Save' },
			])
		).toStrictEqual([
			{ source: 'Save' },
			{ source: 'Save', context: 'button' },
			{ source: 'Save', context: 'the verb' },
		])
	})
})
