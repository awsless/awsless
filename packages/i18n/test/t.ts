import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { parseSync } from 'oxc-parser'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import { i18n, Translator } from '../src'
import { loadCache } from '../src/cache'
import { findSvelteTranslatable } from '../src/find/svelte'
import { findTypescriptTranslatable } from '../src/find/typescript'
import { findTComponents, serialize, tokenize, validatePlaceholders, validateTranslation } from '../src/t'

// Only a <T> imported from this package counts, so the fixtures import it.
const IMPORT_T = "<script>import T from '@awsless/i18n/T'</script>"
const withT = (markup: string) => (markup.includes('@awsless/i18n/T') ? markup : IMPORT_T + markup)
const serializeT = (markup: string) => findTComponents(withT(markup)).flatMap(item => item.segments.map(s => s.source))
const sources = (code: string) => findSvelteTranslatable(withT(code)).map(item => item.source)

const example = 'Hello <1>${0}</1>, you have <2>${1} items</2>. <3/>'
const exampleMarkup = '<T>Hello <b class="x">{name}</b>, you have <Badge count={n}>{n} items</Badge>. <Icon/></T>'
const exampleFr = 'Bonjour <1>${0}</1>, vous avez <2>${1} articles</2>. <3/>'

// Translates from a fixed table, anything else stays the same.
const table = (translations: Record<string, Record<string, string>>): Translator => {
	return (_, list) => {
		return list.map(item => ({
			...item,
			translation: translations[item.source]?.[item.locale] ?? item.source,
		}))
	}
}

// Runs the plugin like a dev server would: a scan at start, then a transform.
const transform = async (
	code: string,
	translate: Translator,
	override?: Record<string, unknown>,
	file = 'page.svelte'
) => {
	const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-t-'))
	const path = resolve(cwd, file)
	await writeFile(path, code)

	if (override) {
		await writeFile(resolve(cwd, 'i18n.json'), JSON.stringify(override))
	}

	const previous = process.cwd()
	process.chdir(cwd)

	try {
		const plugin = i18n({ locales: ['fr', 'jp'], translate })
		const warn = vi.fn()
		const context = { info() {}, warn, environment: { logger: { info() {}, warn } } }

		// @ts-expect-error only the hook body is exercised
		await plugin.buildStart.call(context)

		// @ts-expect-error only the hook body is exercised
		const result = plugin.transform.call(context, code, path)

		return {
			code: (result?.code ?? code) as string,
			map: result?.map,
			warn,
			cache: await loadCache(cwd),
		}
	} finally {
		process.chdir(previous)
	}
}

// Every fixture imports T from this package; `script` adds a line after it.
const component = (markup: string, script = '') => {
	return [
		'<script>',
		"\timport T from '@awsless/i18n/T'",
		...(script ? [`\t${script}`] : []),
		"\timport Badge from './badge.svelte'",
		"\timport Icon from './icon.svelte'",
		"\timport Card from './card.svelte'",
		"\timport Panel from './panel.svelte'",
		"\timport Required from './required.svelte'",
		"\timport Legacy from './legacy.svelte'",
		"\timport Host from './host.svelte'",
		'\tlet { name, n, items, html, s, a, b, p, k, next, rows, languages, x, tag, item } = $props()',
		'</script>',
		'',
		markup,
		'',
	].join('\n')
}

const BADGE =
	'<script>let { count, children } = $props()</script><span class="badge" data-count={count}>{@render children()}</span>'
const ICON = '<i>*</i>'
// Card spreads its rest props onto the div, so a leaked prop would show up as an attribute.
const CARD =
	'<script>let { item = "X", children, ...rest } = $props()</script><div class="card" {...rest}><slot {item} /></div>'

// Compiles for the server and renders once per locale. The real `lang`
// module needs the svelte plugin for its runes, so a stub with the same
// `get`/`pick` semantics stands in and reads the locale from globalThis.
const ssr = async (code: string, props: Record<string, unknown>, locales: string[]) => {
	const dir = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-ssr-'))
	const internal = createRequire(import.meta.url).resolve('svelte/internal/server')

	const emit = async (name: string, source: string) => {
		const js = compile(source, { generate: 'server', filename: `${name}.svelte` }).js.code
		await writeFile(
			resolve(dir, `${name}.js`),
			js
				.replace(/['"]svelte\/internal\/server['"]/, JSON.stringify(internal))
				.replace(/['"]@awsless\/i18n\/svelte['"]/g, "'./lang.js'")
				.replace(/['"]@awsless\/i18n\/T['"]/g, "'./T.js'")
				.replace(/\.svelte(['"])/g, '.js$1')
		)
	}

	await writeFile(
		resolve(dir, 'lang.js'),
		[
			'const locale = () => globalThis.__locale',
			'export const lang = { t: {',
			'\tget: (og, translations) => translations[locale()] ?? og,',
			'\tpick: (source, translations, values = []) => (translations[locale()] ?? source)',
			'\t\t.map(part => typeof part === "number" ? `${values[part] ?? ""}` : part).join(""),',
			'} }',
			'',
		].join('\n')
	)
	await emit('T', await readFile(resolve(__dirname, '../src/T.svelte'), 'utf8'))
	await emit('page', code)
	await emit('badge', BADGE)
	await emit('icon', ICON)
	await emit('card', CARD)
	await emit('panel', '<header><slot name="heading" item="X" pair={{ id: "Y" }} /></header><main><slot /></main>')
	await emit('required', '<script>let { children } = $props()</script><div>{@render children()}</div>')
	await emit('legacy', '<div><slot>fallback</slot></div><aside><slot name="side">side-fallback</slot></aside>')
	await emit('custom', '<script>let { value } = $props()</script><em>{value}</em>')
	await emit('inner', '<i>inner</i>')
	await emit(
		'host',
		"<script>import Inner from './inner.svelte'</script>" +
			'<header><slot name="heading" item={{ Widget: Inner }} list={[Inner, Inner]} deep={{ a: { b: Inner } }} /></header>' +
			'<main><slot item={{ Widget: Inner }} list={[Inner, Inner]} deep={{ a: { b: Inner } }} /></main>'
	)

	const page = await import(pathToFileURL(resolve(dir, 'page.js')).href)

	return locales.map(locale => {
		Object.assign(globalThis, { __locale: locale })
		// Hydration markers are comments and not part of what the user sees.
		return render(page.default, { props }).body.replace(/<!--[^]*?-->/g, '')
	})
}

// One round for a finding: the translated component must compile for the
// client and render the expected markup for en and fr on the server.
const check = async (
	markup: string,
	translations: Record<string, string>,
	props: Record<string, unknown>,
	expected: { en: string; fr: string },
	script?: string
) => {
	const result = await transform(
		component(markup, script),
		table(Object.fromEntries(Object.entries(translations).map(([source, fr]) => [source, { fr }])))
	)

	expect(() => compile(result.code, { generate: 'client', filename: 'page.svelte' })).not.toThrow()

	const [en, fr] = await ssr(result.code, props, ['en', 'fr'])

	expect(en).toBe(expected.en)
	expect(fr).toBe(expected.fr)

	return result
}

describe('<T> serializer', () => {
	it('text', () => {
		expect(serializeT('<T>Hello world</T>')).toStrictEqual(['Hello world'])
	})

	it('expressions become indexed placeholders', () => {
		expect(serializeT('<T>Hello {name}!</T>')).toStrictEqual(['Hello ${0}!'])
		expect(serializeT('<T>{fn({ a: 1 })} {"}"} {(/[{}]/).test(s)}</T>')).toStrictEqual(['${0} ${1} ${2}'])
		const code = withT('<T>{a} {b}</T>')
		const ranges = findTComponents(code)[0]?.segments[0]?.expressions ?? []
		expect(ranges.map(item => code.slice(item.start, item.end))).toStrictEqual(['a', 'b'])
	})

	it('nested element, component with props and self-closing', () => {
		expect(serializeT(exampleMarkup)).toStrictEqual([example])
	})

	it('childless element and comments', () => {
		expect(serializeT('<T>a <b></b> <!-- note --> b</T>')).toStrictEqual(['a <1/> b'])
	})

	it('numbers tags depth-first', () => {
		expect(serializeT('<T><a>x <b>y</b></a> <i/></T>')).toStrictEqual(['<1>x <2>y</2></1> <3/>'])
	})

	it('collapses whitespace', () => {
		expect(serializeT('<T>\n\tHello\n\t<b>\n\t\tworld\n\t</b>\n</T>')).toStrictEqual(['Hello <1>world</1>'])
		expect(serializeT('<T><b>\nHello\n</b>!</T>')).toStrictEqual(['<1>Hello</1>!'])
		expect(serializeT('<T>\n\t<b>\n\t\tHello\n\t</b>\n\t<i>\n\t\tthere\n\t</i>\n</T>')).toStrictEqual([
			'<1>Hello</1> <2>there</2>',
		])
		expect(serializeT('<T>a <b>b</b> <i>c</i> d</T>')).toStrictEqual(['a <1>b</1> <2>c</2> d'])
	})

	it('keeps whitespace in pre, textarea, preserveWhitespace and non-breaking spaces', () => {
		expect(serializeT('<T>Hi <pre>Hello\n  world</pre></T>')).toStrictEqual(['Hi <1>Hello\n  world</1>'])
		expect(serializeT('<T><textarea>a\n\nb</textarea></T>')).toStrictEqual(['<1>a\n\nb</1>'])
		expect(serializeT('<pre><T>a\n  b</T></pre>')).toStrictEqual(['a\n  b'])
		expect(serializeT('<svelte:options preserveWhitespace={true} /><T>\n a  b\n</T>')).toStrictEqual(['\n a  b\n'])
		expect(serializeT('<T>a&nbsp;b  c&amp;d</T>')).toStrictEqual(['a b  c&d'])
		expect(serializeT('<T>&nbsp;Hello&nbsp;</T>')).toStrictEqual([' Hello '])
		expect(serializeT('<T>  Hello  </T>')).toStrictEqual([' Hello '])
	})

	it('escapes text that looks like markup', () => {
		expect(serializeT('<T>&#36;&#123;0&#125; and &lt;1&gt; $5 a\\b</T>')).toStrictEqual([
			'\\${0} and \\<1\\> \\$5 a\\\\b',
		])
		expect(serialize(tokenize('\\${0} and \\<1\\> \\$5 a\\\\b'))).toBe('\\${0} and \\<1\\> \\$5 a\\\\b')
	})

	it('finds <T> inside markup and blocks', () => {
		expect(serializeT('<div>{#if x}<Card><T>inner</T></Card>{/if}</div>')).toStrictEqual(['inner'])
	})

	it('throws on nested <T>', () => {
		expect(() => findTComponents(withT('<div>\n<T>a <T>b</T></T>\n</div>'), 'page.svelte')).toThrow(
			'page.svelte:2: nested <T> is not supported inside <T>'
		)
	})

	it('blocks become self-closing tags with their own segments', () => {
		const code = '<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>'

		expect(sources(code)).toStrictEqual(['You have <1/> left.', 'no items', '<1>${0}</1> items'])
	})

	it('nested blocks', () => {
		expect(sources('<T>{#if a}{#if b}x{/if}{/if}</T>')).toStrictEqual(['<1/>', '<1/>', 'x'])
		expect(sources('<T>{#each rows as r}{#each r as c}{c}!{/each}{/each}</T>')).toStrictEqual([
			'<1/>',
			'<1/>',
			'${0}!',
		])
		expect(sources('<T>{#if a}{#if b}x{/if}{:else}y{/if} z</T>')).toStrictEqual(['<1/> z', '<1/>', 'x', 'y'])
	})

	it('each with else', () => {
		const code = '<T>Items: {#each items as item, i (item.id)}<li>{item.name}</li>{:else}No items{/each}</T>'

		expect(sources(code)).toStrictEqual(['Items: <1/>', '<1>${0}</1>', 'No items'])
	})

	it('else if chain, await and key', () => {
		const code = [
			'<T>',
			'{#if a}one{:else if b}two{:else}three{/if}',
			'{#await p}wait{:then v}got {v}{:catch e}{/await}',
			'{#key k}<b>keyed</b>{/key}',
			'</T>',
		].join('\n')

		expect(sources(code)).toStrictEqual([
			'<1/> <2/> <3/>',
			'one',
			'two',
			'three',
			'wait',
			'got ${0}',
			'<1>keyed</1>',
		])
	})

	it('html, render and const produce no segment', () => {
		const code = '<T>{@const x = 1}Hi {@html html} {@render s()}</T>'

		expect(sources(code)).toStrictEqual(['<1/>Hi <2/> <3/>'])
	})

	it('keeps an explicit children snippet as a block with its own segment', () => {
		const code = '<T>\n\t{#snippet children()}Hello <b>{name}</b>{/snippet}\n</T>'

		expect(sources(code)).toStrictEqual(['<1/>', 'Hello <1>${0}</1>'])
		expect(sources('<T>{#snippet other()}Hi{/snippet}</T>')).toStrictEqual(['<1/>', 'Hi'])
	})

	it('skips empty <T>', () => {
		expect(sources('<T></T><T />')).toStrictEqual([])
	})
})

describe('lang.t validation', () => {
	it('checks placeholders only and treats angle brackets as text', () => {
		expect(validatePlaceholders('Rank <1>', 'Rang inférieur à 1')).toBeUndefined()
		expect(validatePlaceholders('Hi ${name}', 'Salut ${name}')).toBeUndefined()
		expect(validatePlaceholders('Hi ${name}', 'Salut')).toBeDefined()
		expect(validatePlaceholders('Hi ${name}', 'Salut ${name} ${name}')).toBeDefined()
		expect(findSvelteTranslatable(withT('<p>{lang.t`Rank <1>`}</p><T>Hi</T>'))).toStrictEqual([
			{ source: 'Rank <1>', kind: 't' },
			{ source: 'Hi', kind: 'markup' },
		])
	})
})

describe('<T> validation', () => {
	it('accepts moved text, reordered placeholders in a run and kept structure', () => {
		expect(validateTranslation(example, exampleFr)).toBeUndefined()
		expect(validateTranslation('<1>a</1> b', '<1></1> a b')).toBeUndefined()
		expect(validateTranslation('${0} ${1}', '${1} ${0}')).toBeUndefined()
		expect(validateTranslation('\\${0} \\<1\\>', '\\${0} et \\<1\\>')).toBeUndefined()
	})

	it('rejects reordered, dropped, duplicated or moved tags and placeholders', () => {
		expect(validateTranslation(example, 'Vous avez <2>${1} articles</2>, <1>${0}</1>. <3/>')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${0}</1>, <2>${1} articles</2>.')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${0}</1>, <2>${1} articles</2>. <3/> <3/>')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${2}</1>, <2>${1} articles</2>. <3/>')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${0}, <2>${1} articles</1></2>. <3/>')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${0}</1>, <2>${1} articles</2>. <3></3>')).toBeDefined()
		expect(validateTranslation('<1>Hello ${0}</1>', '${0} <1>Bonjour</1>')).toBeDefined()
		expect(validateTranslation('Hello ${0}', 'Bonjour ${0} ${0}')).toBeDefined()
		expect(validateTranslation('<1>a</1> <2>b</2>', '<1>a <2>b</2></1>')).toBeDefined()
		expect(validateTranslation('\\${0}', '${0}')).toBeDefined()
	})
})

describe('<T> transform', () => {
	it('wraps the children in a block scope and replaces text runs', async () => {
		const { code, map } = await transform(component(exampleMarkup), table({ [example]: { fr: exampleFr } }))

		expect(code).toContain(
			'{#if true}' +
				'{__i18n_lang.t.pick(["Hello "], {"fr":["Bonjour "]})}<b class="x">{name}</b>' +
				'{__i18n_lang.t.pick([", you have "], {"fr":[", vous avez "]})}' +
				'<Badge count={n}>{__i18n_lang.t.pick([0," items"], {"fr":[0," articles"]}, [(n)])}</Badge>. <Icon/>' +
				'{/if}'
		)
		expect(code).not.toContain('<T')
		expect(code.match(/<Badge/g)).toHaveLength(1)
		expect(map.mappings).toBeTypeOf('string')
		expect(() => compile(code, { generate: 'client', filename: 'page.svelte' })).not.toThrow()
	})

	it('emits the block example', async () => {
		const source = '<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>'
		const { code } = await transform(
			component(source),
			table({
				'You have <1/> left.': { fr: 'Il vous reste <1/>.' },
				'no items': { fr: 'aucun article' },
				'<1>${0}</1> items': { fr: '<1>${0}</1> articles' },
			})
		)

		expect(code).toContain(
			'{#if true}' +
				'{__i18n_lang.t.pick(["You have "], {"fr":["Il vous reste "]})}' +
				'{#if n === 0}{__i18n_lang.t.pick(["no items"], {"fr":["aucun article"]})}' +
				'{:else}<b>{n}</b>{__i18n_lang.t.pick([" items"], {"fr":[" articles"]})}{/if}' +
				'{__i18n_lang.t.pick([" left."], {"fr":["."]})}' +
				'{/if}'
		)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('injects the aliased import on its own line, once', async () => {
		const translate = table({ Hello: { fr: 'Bonjour' } })
		const head =
			"<script>import { lang as __i18n_lang } from '@awsless/i18n/svelte'\n\timport T from '@awsless/i18n/T'"

		const missing = await transform(component('<T>Hello</T>'), translate)
		expect(missing.code).toContain(head)
		expect(missing.code.match(/__i18n_lang } from/g)).toHaveLength(1)

		const present = await transform(
			component('<T>Hello</T>', "import { lang } from '@awsless/i18n/svelte'"),
			translate
		)
		expect(present.code).toContain(head)
		expect(present.code.match(/@awsless\/i18n\/svelte/g)).toHaveLength(2)

		const sameLine = await transform(
			'<script>import T from \'@awsless/i18n/T\'; let name = "Ann";</script><T>Hello</T>',
			translate
		)
		expect(sameLine.code).toContain(
			"<script>import { lang as __i18n_lang } from '@awsless/i18n/svelte';\nimport T from '@awsless/i18n/T'; let name = \"Ann\";</script>"
		)

		// The import may live in the module script, leaving no instance script to extend.
		const noScript = await transform(
			"<script module>import T from '@awsless/i18n/T'</script>\n<p><T>Hello</T></p>\n",
			translate
		)
		expect(noScript.code).toBe(
			"<script>\n\timport { lang as __i18n_lang } from '@awsless/i18n/svelte'\n</script>\n" +
				"<script module>import T from '@awsless/i18n/T'</script>\n" +
				'<p>{#if true}{__i18n_lang.t.pick(["Hello"], {"fr":["Bonjour"]})}{/if}</p>\n'
		)
		expect(() => compile(noScript.code, { generate: 'client' })).not.toThrow()
	})

	it('scopes <T> without translations too, but skips the import', async () => {
		const { code } = await transform(component('<p><T>Hello <b>{name}</b></T></p>'), table({}))

		expect(code).toContain('<p>{#if true}Hello <b>{name}</b>{/if}</p>')
		expect(code).not.toContain('__i18n_lang } from')
	})

	it('drops a broken translation with a warning and keeps the source', async () => {
		const { code, warn, cache } = await transform(
			component(exampleMarkup),
			table({
				[example]: {
					fr: 'Bonjour <1>${0}</1>, vous avez <2>${1} articles</2>.',
					jp: 'こんにちは <1>${0}</1>、<2>${1} 件</2>。<3/>',
				},
			})
		)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain(`"fr" translation of "${example}"`)
		expect(cache.get(example, 'fr')).toBeUndefined()
		expect(code).toContain('{__i18n_lang.t.pick(["Hello "], {"jp":["こんにちは "]})}')
	})

	it('warns about a broken override and keeps the source', async () => {
		const { code, warn } = await transform(component(exampleMarkup), table({}), {
			[example]: { jp: 'こんにちは <1>${0}</1>、<2>${1} 件</2>' },
		})

		expect(warn).toHaveBeenCalledTimes(1)
		expect(code).toContain('Hello <b class="x">{name}</b>, you have')
	})

	it('still rewrites lang.t next to and inside a <T>', async () => {
		const { code } = await transform(
			component('<T>Hello {lang.t`x`}</T>\n<p>{lang.t`Bye`}</p>', "import { lang } from '@awsless/i18n/svelte'"),
			table({ 'Hello ${0}': { fr: 'Bonjour ${0}' }, Bye: { fr: 'Au revoir' }, x: { fr: 'y' } })
		)

		expect(code).toContain(
			'{__i18n_lang.t.pick(["Hello ",0], {"fr":["Bonjour ",0]}, [(lang.t.get(`x`, {"fr":`y`}))])}'
		)
		expect(code).toContain('<p>{lang.t.get(`Bye`, {"fr":`Au revoir`})}</p>')
	})
})

describe('<T> compile and render', () => {
	it('switches locale with exactly one nested component instance', async () => {
		const { code } = await check(
			exampleMarkup,
			{ [example]: exampleFr },
			{ name: 'Ann', n: 3 },
			{
				en: 'Hello <b class="x">Ann</b>, you have <span class="badge" data-count="3">3 items</span>. <i>*</i>',
				fr: 'Bonjour <b class="x">Ann</b>, vous avez <span class="badge" data-count="3">3 articles</span>. <i>*</i>',
			}
		)

		expect(code.match(/<Badge/g)).toHaveLength(1)
	})

	it('renders braces and regex literals inside expressions', async () => {
		await check(
			'<T>Got {"}"} and {(/[{}]/).test(s) ? "braces" : "none"}!</T>',
			{ 'Got ${0} and ${1}!': 'Reçu ${1} et ${0} !' },
			{ s: '{x}' },
			{ en: 'Got } and braces!', fr: 'Reçu braces et } !' }
		)
	})

	it('keeps a placeholder inside its let: scope', async () => {
		const { warn } = await check(
			'<T><Card let:item>Hello {item}</Card></T>',
			{ '<1>Hello ${0}</1>': '${0} <1>Bonjour</1>' },
			{},
			{ en: '<div class="card">Hello X</div>', fr: '<div class="card">Hello X</div>' }
		)

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('preserves whitespace in pre', async () => {
		await check(
			'<T>Code: <pre>Hello\n  world</pre></T>',
			{ 'Code: <1>Hello\n  world</1>': 'Code : <1>Bonjour\n  le monde</1>' },
			{},
			{ en: 'Code: <pre>Hello\n  world</pre>', fr: 'Code : <pre>Bonjour\n  le monde</pre>' }
		)
	})

	it('preserves non-breaking spaces, also at the edges', async () => {
		await check(
			'<T>&nbsp;Hello&nbsp;{name} </T>',
			{ ' Hello ${0} ': ' Bonjour ${0} ' },
			{ name: 'Ann' },
			{ en: ' Hello Ann ', fr: ' Bonjour Ann ' }
		)
	})

	it('renders nothing for an empty <T>', async () => {
		const { code } = await check('<p><T/><T></T><T>\n</T></p>', {}, {}, { en: '<p></p>', fr: '<p></p>' })

		expect(code).not.toContain('<T')
	})

	it('renders an explicit children snippet body inside the scope', async () => {
		const { code } = await check(
			'<T>\n\t{#snippet children()}{@const greeting = "Hello"}{greeting} <b>{name}</b>{/snippet}\n</T>',
			{ '<1/>${0} <2>${1}</2>': '<1/>${0}, <2>${1}</2>' },
			{ name: 'Ann' },
			{ en: 'Hello <b>Ann</b>', fr: 'Hello, <b>Ann</b>' }
		)

		expect(code).toContain('{#snippet children()}{@const greeting = "Hello"}')
		expect(code).toContain('{/snippet}\n{@render children()}{/if}')
	})

	it('renders translated block bodies in place', async () => {
		await check(
			'<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>',
			{
				'You have <1/> left.': 'Il vous reste <1/>.',
				'no items': 'aucun article',
				'<1>${0}</1> items': '<1>${0}</1> articles',
			},
			{ n: 2 },
			{ en: 'You have <b>2</b> items left.', fr: 'Il vous reste <b>2</b> articles.' }
		)
	})

	it('keeps every closer of nested blocks', async () => {
		await check('<T>{#if a}{#if b}x{/if}{/if}</T>', { x: 'y' }, { a: true, b: true }, { en: 'x', fr: 'y' })
		await check(
			'<T>{#each rows as r}{#each r as c}{c}!{/each}{/each}</T>',
			{ '${0}!': '${0} !' },
			{ rows: [[1, 2], [3]] },
			{ en: '1!2!3!', fr: '1 !2 !3 !' }
		)
		await check(
			'<T>{#key k}{#if a}x{/if}{/key} {#await p}wait{:then v}{#if v}got{/if}{/await}</T>',
			{ x: 'y', wait: 'attendez', got: 'reçu' },
			{ k: 1, a: true, p: new Promise(() => {}) },
			{ en: 'x wait', fr: 'y attendez' }
		)
		await check(
			'<T>{#if a}{#if b}x{/if}{:else}y{/if} z</T>',
			{ '<1/> z': '<1/> Z', x: 'X', y: 'Y' },
			{ a: false, b: true },
			{ en: 'y z', fr: 'Y Z' }
		)
	})

	it('keeps declarations scoped without leaking props', async () => {
		await check(
			'<T>{@const x = 1}Hello {x}</T>',
			{ '<1/>Hello ${0}': '<1/>Bonjour ${0}' },
			{},
			{
				en: 'Hello 1',
				fr: 'Bonjour 1',
			}
		)
		await check(
			'<Card><T>{@const x = 1}Hello {x}</T></Card>',
			{ '<1/>Hello ${0}': '<1/>Bonjour ${0}' },
			{},
			{ en: '<div class="card">Hello 1</div>', fr: '<div class="card">Bonjour 1</div>' }
		)
		await check(
			'<T>{#snippet row()}R{/snippet}{@render row()}</T><T>{#snippet row()}Q{/snippet}{@render row()}</T>',
			{ R: 'R!', Q: 'Q!' },
			{},
			{ en: 'RQ', fr: 'R!Q!' }
		)
	})

	it('evaluates each expression once per render', async () => {
		let count = 0
		const next = () => ++count

		await check(
			'<T>Hello {next()}</T>',
			{ 'Hello ${0}': 'Bonjour ${0}' },
			{ next },
			{
				en: 'Hello 1',
				fr: 'Bonjour 2',
			}
		)

		expect(count).toBe(2)
	})

	it('renders nullish values as empty text', async () => {
		await check(
			'<T>Hello {null} {undefined}</T>',
			{ 'Hello ${0} ${1}': 'Bonjour ${0} ${1}' },
			{},
			{
				en: 'Hello  ',
				fr: 'Bonjour  ',
			}
		)
	})

	it('round-trips text that looks like a placeholder or tag', async () => {
		await check(
			'<T>&#36;&#123;0&#125; and &lt;1&gt; for $5</T>',
			{ '\\${0} and \\<1\\> for \\$5': '\\${0} et \\<1\\> pour 5\\$' },
			{},
			// Svelte's server escape leaves `>` alone.
			{ en: '${0} and &lt;1> for $5', fr: '${0} et &lt;1> pour 5$' }
		)
	})

	it('injects the import with a same-line first statement', async () => {
		const { code } = await transform(
			'<script>import T from \'@awsless/i18n/T\'; let name = "Ann";</script><T>Hello {name}</T>',
			table({ 'Hello ${0}': { fr: 'Bonjour ${0}' } })
		)

		expect(code).toContain("<script>import { lang as __i18n_lang } from '@awsless/i18n/svelte';\nimport T")
		expect(() => compile(code, { generate: 'client' })).not.toThrow()

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])

		expect(en).toBe('Hello Ann')
		expect(fr).toBe('Bonjour Ann')
	})

	it('is not shadowed by a lang of the component', async () => {
		await check(
			'{#each languages as lang}<T>Hello {lang}</T>{/each}',
			{ 'Hello ${0}': 'Bonjour ${0}' },
			{ languages: ['nl', 'de'] },
			{ en: 'Hello nlHello de', fr: 'Bonjour nlBonjour de' }
		)

		const { code } = await transform(
			'<script>import T from \'@awsless/i18n/T\'\n\tlet lang = "shadow"</script><T>Hello {lang}</T>',
			table({ 'Hello ${0}': { fr: 'Bonjour ${0}' } })
		)
		const [en, fr] = await ssr(code, {}, ['en', 'fr'])

		expect(en).toBe('Hello shadow')
		expect(fr).toBe('Bonjour shadow')
	})
})

describe('<T> wrapper and normalisation', () => {
	it('keeps a sequence expression as one value', async () => {
		await check(
			'<T>Value {(n++, n)} then {n}</T>',
			{ 'Value ${0} then ${1}': 'Value ${1} then ${0}' },
			{ n: 1 },
			{ en: 'Value 2 then 2', fr: 'Value 2 then 2' }
		)
	})

	it('keeps a children snippet with parameters and renders it', async () => {
		const markup = '<T>{#snippet children(x="DEFAULT")}Hello {x}{/snippet}</T>'
		const translations = { 'Hello ${0}': 'Bonjour ${0}' }
		const expected = { en: 'Hello DEFAULT', fr: 'Bonjour DEFAULT' }

		const { code } = await check(markup, translations, {}, expected)
		await check(markup, translations, { x: 'OUTER' }, expected)

		expect(code).toContain(
			'{#if true}{#snippet children(x="DEFAULT")}{__i18n_lang.t.pick(["Hello ",0], {"fr":["Bonjour ",0]}, [(x)])}{/snippet}{@render children()}{/if}'
		)
	})

	it('unwraps a svelte:fragment child', async () => {
		const { code } = await check(
			'<T><svelte:fragment>Hello</svelte:fragment></T>',
			{ Hello: 'Bonjour' },
			{},
			{ en: 'Hello', fr: 'Bonjour' }
		)
		expect(code).not.toContain('svelte:fragment')

		const plain = await check(
			'<T>a <svelte:fragment>b</svelte:fragment> c<svelte:fragment /></T>',
			{},
			{},
			{
				en: 'a b c',
				fr: 'a b c',
			}
		)
		expect(plain.code).toContain('{#if true}a b c{/if}')
	})

	it('treats svelte:element as whitespace sensitive', async () => {
		await check(
			'<T><svelte:element this={tag}>Hello\n  world</svelte:element></T>',
			{ '<1>Hello\n  world</1>': '<1>Bonjour\n  le monde</1>' },
			{ tag: 'pre' },
			{ en: '<pre>Hello\n  world</pre>', fr: '<pre>Bonjour\n  le monde</pre>' }
		)
		expect(serializeT('<T><svelte:element this="b">a\n  b</svelte:element></T>')).toStrictEqual(['<1>a\n  b</1>'])
	})
})

describe('<T> snippets, whitespace and lang.t', () => {
	it('keeps helper snippets next to the children snippet', async () => {
		const markup =
			'<T>{#snippet helper()}world{/snippet}{#snippet children()}Hello {@render helper()}{/snippet}</T>'
		const { code } = await check(
			markup,
			{ 'Hello <1/>': 'Bonjour <1/>' },
			{},
			{ en: 'Hello world', fr: 'Bonjour world' }
		)

		expect(code).toContain(
			'{#snippet helper()}world{/snippet}{#snippet children()}{__i18n_lang.t.pick(["Hello "], {"fr":["Bonjour "]})}{@render helper()}{/snippet}{@render children()}{/if}'
		)
	})

	it('trims element boundaries like Svelte does', async () => {
		const baseline = await ssr(component('<b>\nHello\n</b>!'), {}, ['en'])
		expect(baseline[0]).toBe('<b>Hello</b>!')

		await check(
			'<T><b>\nHello\n</b>!</T>',
			{ '<1>Hello</1>!': '<1>Bonjour</1>!' },
			{},
			{
				en: '<b>Hello</b>!',
				fr: '<b>Bonjour</b>!',
			}
		)

		const indented = '\n\t<b>\n\t\tHello\n\t</b>\n\t<i>\n\t\tthere\n\t</i>\n'
		const [plain] = await ssr(component(indented), {}, ['en'])
		expect(plain).toBe('<b>Hello</b> <i>there</i>')

		await check(
			`<T>${indented}</T>`,
			{ '<1>Hello</1> <2>there</2>': '<1>Bonjour</1> <2>toi</2>' },
			{},
			{
				en: '<b>Hello</b> <i>there</i>',
				fr: '<b>Bonjour</b> <i>toi</i>',
			}
		)
	})

	it('stores a lang.t translation with angle brackets', async () => {
		const { code, cache, warn } = await transform(
			component('<p>{lang.t`Rank <1>`}</p>', "import { lang } from '@awsless/i18n/svelte'"),
			table({ 'Rank <1>': { fr: 'Rang inférieur à 1' } })
		)

		expect(warn).not.toHaveBeenCalled()
		expect(cache.get('Rank <1>', 'fr')).toBe('Rang inférieur à 1')
		expect(code).toContain('{lang.t.get(`Rank <1>`, {"fr":`Rang inférieur à 1`})}')

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('<p>Rank &lt;1></p>')
		expect(fr).toBe('<p>Rang inférieur à 1</p>')
	})
})

// Uppercases every text token, so each run changes and gets a call while
// whitespace and structure stay exactly as in the source.
const upper: Translator = (_, list) =>
	list.map(item => ({
		...item,
		translation: serialize(
			tokenize(item.source).map(token =>
				token.type === 'text' ? { ...token, value: token.value.toUpperCase() } : token
			)
		),
	}))

// Renders the markup untransformed with the real T.svelte and transformed with
// a translation present; Svelte's whitespace handling must come out the same.
const parity = async (markup: string, props: Record<string, unknown> = {}) => {
	const [baseline] = await ssr(component(markup), props, ['en'])
	const { code } = await transform(component(markup), upper)

	expect(() => compile(code, { generate: 'client', filename: 'page.svelte' })).not.toThrow()

	const [en, fr] = await ssr(code, props, ['en', 'fr'])

	expect(en).toBe(baseline)
	expect(fr!.toLowerCase()).toBe(baseline!.toLowerCase())

	return { baseline: baseline!, fr, code }
}

describe('<T> whitespace parity with svelte', () => {
	it('interior newline', async () => {
		const { baseline, fr } = await parity('<T>Hello\nworld</T>')
		expect(baseline).toBe('Hello\nworld')
		expect(fr).toBe('HELLO\nWORLD')
	})

	it('indented multi-line markup', async () => {
		const { baseline, code } = await parity('<T>\n\t<b>\n\t\tHello\n\t</b>\n\t<i>\n\t\tthere\n\t</i>\n</T>')
		expect(baseline).toBe('<b>Hello</b> <i>there</i>')
		expect(code).toContain('__i18n_lang.t.pick')
	})

	it('text next to blocks, components and expressions', async () => {
		await parity('<T>Hello\n{#if a}\n  yes\n{/if}\n!</T>', { a: true })
		await parity('<T>Hi\n  <Badge count={n}>\n x \n</Badge>\n  there</T>', { n: 1 })
		const { baseline } = await parity('<T>Hello \n {name}\n !</T>', { name: 'Ann' })
		expect(baseline).toBe('Hello \n Ann\n !')
		await parity('<T>{name}\n  and\n{name}</T>', { name: 'Ann' })
		await parity('<T>a {@const q = 1} b {q}</T>')
		await parity('<T>a <!-- note --> b<!-- c -->\n\nc</T>')
	})

	it('inline and block elements', async () => {
		const { baseline } = await parity('<T><div>\n a \n</div><span>\n b \n</span> c <b>d</b></T>')
		expect(baseline).toBe('<div>a</div><span>b</span> c <b>d</b>')
		await parity('<T><select>\n<option>a</option>\n<option>b</option>\n</select></T>')
	})

	it('pre, textarea and svelte:element', async () => {
		const { baseline } = await parity('<T>x<pre>\nHello\n  world\n</pre></T>')
		// Only a text node that is exactly one newline is dropped after <pre>.
		expect(baseline).toBe('x<pre>\nHello\n  world\n</pre>')
		const lone = await parity('<T><pre>\n</pre><pre>\nx</pre></T>')
		expect(lone.baseline).toBe('<pre></pre><pre>\nx</pre>')
		await parity('<T><textarea>\n a\n</textarea></T>')
		const dynamic = await parity('<T><svelte:element this={tag}>\nHello\n  world\n</svelte:element></T>', {
			tag: 'pre',
		})
		expect(dynamic.baseline).toBe('<pre>Hello\n  world</pre>')
	})

	it('white-space: pre-line container', async () => {
		const { baseline } = await parity('<T><p style="white-space: pre-line">Hello\nworld\n  next\n</p></T>')
		expect(baseline).toBe('<p style="white-space: pre-line">Hello\nworld\n  next</p>')
	})

	it('whitespace-only edits change the key only when svelte renders differently', async () => {
		await parity('<T>Hello world</T>')
		await parity('<T>Hello\n<b>x</b></T>')
		expect(sources('<T>Hello world</T>')).not.toStrictEqual(sources('<T>Hello\nworld</T>'))
		expect(sources('<T>Hello <b>x</b></T>')).toStrictEqual(sources('<T>Hello\n<b>x</b></T>'))
	})
})

describe('lang.t rewriting by AST', () => {
	it('leaves text that looks like lang.t alone and rewrites the real one', async () => {
		const markup = '<T>Use lang.t&#96;x&#96; with {lang.t`x`}</T>'
		const { code } = await transform(
			component(markup, "import { lang } from '@awsless/i18n/svelte'"),
			table({ 'Use lang.t`x` with ${0}': { fr: 'Utilisez lang.t`x` with ${0}' }, x: { fr: 'z' } })
		)

		expect(() => compile(code, { generate: 'client' })).not.toThrow()
		expect(() => compile(code, { generate: 'server' })).not.toThrow()

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('Use lang.t`x` with x')
		expect(fr).toBe('Utilisez lang.t`x` with z')
	})

	it('rewrites templates in attributes and scripts too', async () => {
		const { code } = await transform(
			"<script>import { lang } from '@awsless/i18n/svelte'\n\tconst a = lang.t`x`</script><p title={lang.t`x`}>{a}</p>",
			table({ x: { fr: 'z' } })
		)

		expect(code).toBe(
			'<script>import { lang } from \'@awsless/i18n/svelte\'\n\tconst a = lang.t.get(`x`, {"fr":`z`})</script><p title={lang.t.get(`x`, {"fr":`z`})}>{a}</p>'
		)
	})
})

describe('nested lang.t and passed children', () => {
	const nested = {
		'Hello ${0}!': { fr: 'Bonjour ${0} !' },
		'Hello ${lang.t`world`}': { fr: 'Bonjour ${lang.t`world`}' },
		world: { fr: 'monde' },
	}
	const world = 'lang.t.get(`world`, {"fr":`monde`})'
	const outer = `lang.t.get(\`Hello \${${world}}\`, {"fr":\`Bonjour \${${world}}\`})`

	it('composes nested templates inside a <T> run', async () => {
		const { code } = await transform(
			component('<T>Hello {lang.t`Hello ${lang.t`world`}`}!</T>', "import { lang } from '@awsless/i18n/svelte'"),
			table(nested)
		)

		expect(code).toContain(`[(${outer})]`)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
		expect(() => compile(code, { generate: 'server' })).not.toThrow()

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('Hello Hello world!')
		expect(fr).toBe('Bonjour Bonjour monde !')
	})

	it('composes nested templates outside a <T>', async () => {
		const { code } = await transform(
			component('<p>{lang.t`Hello ${lang.t`world`}`}</p>', "import { lang } from '@awsless/i18n/svelte'"),
			table(nested)
		)

		expect(code).toContain(`<p>{${outer}}</p>`)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
		expect(() => compile(code, { generate: 'server' })).not.toThrow()

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('<p>Hello world</p>')
		expect(fr).toBe('<p>Bonjour monde</p>')
	})

	it('composes nested templates in a .ts file', async () => {
		const source =
			"import { lang } from '@awsless/i18n/svelte'\nexport const text = lang.t`Hello ${lang.t`world`}`\n"
		const { code } = await transform(source, table(nested), undefined, 'lib.ts')

		expect(code).toBe(`import { lang } from '@awsless/i18n/svelte'\nexport const text = ${outer}\n`)
		expect(parseSync('lib.ts', code).errors).toStrictEqual([])
	})

	it('leaves a <T> with passed children to the runtime component', async () => {
		for (const markup of [
			'{#snippet greeting()}Hello{/snippet}<T children={greeting}/>',
			'{#snippet greeting()}Hello{/snippet}<T children={greeting}></T>',
		]) {
			const [before] = await ssr(component(markup), {}, ['en'])
			const { code } = await transform(component(markup), upper)

			expect(before).toBe('Hello')
			expect(code).toContain(markup)
			expect(() => compile(code, { generate: 'client' })).not.toThrow()

			const [after] = await ssr(code, {}, ['en'])
			expect(after).toBe('Hello')
		}

		expect(sources('<T children={greeting}/><T {...rest}>x</T>')).toStrictEqual([])
	})
})

describe('<T> inside <T> and slot placement', () => {
	it('keeps a skipped inner <T> opaque between runs', async () => {
		for (const inner of ['<T children={greeting}/>', '<T {...{ children: greeting }}/>']) {
			const markup = `{#snippet greeting()}MID{/snippet}<T>before ${inner} after</T>`

			expect(sources(markup)).toStrictEqual(['before <1/> after'])
			await parity(markup)

			const { code } = await transform(
				component(markup),
				table({ 'before <1/> after': { fr: 'avant <1/> après' } })
			)
			const [en, fr] = await ssr(code, {}, ['en', 'fr'])

			expect(en).toBe('before MID after')
			expect(fr).toBe('avant MID après')
		}
	})

	it('keeps named slot content in place', async () => {
		const markup = '<Panel><T slot="heading">Hello</T><p>Body</p></Panel>'
		const expected = '<header>Hello</header><main><p>Body</p></main>'

		const { baseline } = await parity(markup)
		expect(baseline).toBe(expected)

		const { code } = await transform(component(markup), table({ Hello: { fr: 'Bonjour' } }))
		expect(code).toContain(
			'<Panel><svelte:fragment slot="heading">{#if true}{__i18n_lang.t.pick(["Hello"], {"fr":["Bonjour"]})}{/if}</svelte:fragment><p>Body</p></Panel>'
		)

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe(expected)
		expect(fr).toBe('<header>Bonjour</header><main><p>Body</p></main>')
	})

	it('leaves a slotted <T> alone outside a component', async () => {
		const markup = '<div><T slot="x">Hello</T></div>'

		expect(sources(markup)).toStrictEqual([])

		const { code } = await transform(component(markup), table({ Hello: { fr: 'Bonjour' } }))
		expect(code).toContain(markup)
	})
})

describe('slot bindings and empty <T>', () => {
	it('carries let: directives onto the fragment', async () => {
		const cases = [
			['<Panel><T slot="heading" let:item>Hello {item}</T></Panel>', 'X', 'let:item'],
			['<Panel><T slot="heading" let:item={thing}>Hello {thing}</T></Panel>', 'X', 'let:item={thing}'],
			['<Panel><T slot="heading" let:pair={{ id }}>Hello {id}</T></Panel>', 'Y', 'let:pair={{ id }}'],
		] as const

		for (const [markup, value, directive] of cases) {
			// An outer `item` prop must not leak into the slot scope.
			const { baseline } = await parity(markup, { item: 'OUTER' })
			expect(baseline).toBe(`<header>Hello ${value}</header><main></main>`)

			const { code } = await transform(component(markup), table({ 'Hello ${0}': { fr: 'Bonjour ${0}' } }))
			expect(code).toContain(`<svelte:fragment slot="heading" ${directive}>{#if true}`)

			const [en, fr] = await ssr(code, { item: 'OUTER' }, ['en', 'fr'])
			expect(en).toBe(baseline)
			expect(fr).toBe(`<header>Bonjour ${value}</header><main></main>`)
		}
	})

	it('leaves an empty block where an empty <T> was', async () => {
		for (const markup of ['<Required><T /></Required>', '<Required><T></T></Required>']) {
			const { baseline, code } = await parity(markup)
			expect(baseline).toBe('<div></div>')
			expect(code).toContain('<Required>{#if true}{/if}</Required>')
		}

		const empty = await parity('<Required><T>{#snippet children()}{/snippet}</T></Required>')
		expect(empty.baseline).toBe('<div></div>')
		expect(empty.code).toContain(
			'<Required>{#if true}{#snippet children()}{/snippet}{@render children()}{/if}</Required>'
		)

		const { baseline, code } = await parity('<Legacy><T /><T slot="side" let:item /></Legacy>')
		expect(baseline).toBe('<div></div><aside></aside>')
		expect(code).toContain(
			'<Legacy>{#if true}{/if}<svelte:fragment slot="side" let:item>{#if true}{/if}</svelte:fragment></Legacy>'
		)

		const [fallback] = await ssr(component('<Legacy></Legacy>'), {}, ['en'])
		expect(fallback).toBe('<div>fallback</div><aside>side-fallback</aside>')
	})
})

describe('binding, named slots and raw text', () => {
	const script = (imports: string, markup: string) =>
		`<script>\n\t${imports}\n\tlet { list, name } = $props()\n</script>\n${markup}\n`

	it('only touches the <T> imported from this package', async () => {
		const custom = script("import T from './custom.svelte'", '<T value="IMPORTANT"/>')
		expect(findSvelteTranslatable(custom)).toStrictEqual([])
		const [before] = await ssr(custom, {}, ['en'])
		const { code } = await transform(custom, upper)
		expect(code).toBe(custom)
		expect(before).toBe('<em>IMPORTANT</em>')
		expect((await ssr(code, {}, ['en']))[0]).toBe(before)

		const none = '<p><T>Hello</T></p>'
		expect(findSvelteTranslatable(none)).toStrictEqual([])
		expect((await transform(none, upper)).code).toBe(none)
	})

	it('skips a shadowed name', async () => {
		for (const markup of [
			'{#each list as T}<T/>{/each}',
			'{#each list as item, T}<T/>{/each}',
			'{#snippet row(T)}<T/>{/snippet}',
			'{#await list then T}<T/>{/await}',
			'<Card let:item={T}><T/></Card>',
			'{#if list}{@const T = list[0]}<T/>{/if}',
		]) {
			const code = script("import T from '@awsless/i18n/T'", `${markup}<T>Hello</T>`)
			expect(findSvelteTranslatable(code).map(item => item.source)).toStrictEqual(['Hello'])
			const result = await transform(code, upper)
			expect(result.code).toContain(markup)
			expect(() => compile(result.code, { generate: 'client' })).not.toThrow()
		}
	})

	it('transforms an aliased import', async () => {
		const aliased = script("import Trans from '@awsless/i18n/T'", '<Trans>Hello {name}</Trans>')
		expect(findSvelteTranslatable(aliased).map(item => item.source)).toStrictEqual(['Hello ${0}'])

		const [before] = await ssr(aliased, { name: 'Ann' }, ['en'])
		const { code } = await transform(aliased, table({ 'Hello ${0}': { fr: 'Bonjour ${0}' } }))
		expect(code).not.toContain('<Trans')
		expect(() => compile(code, { generate: 'client' })).not.toThrow()

		const [en, fr] = await ssr(code, { name: 'Ann' }, ['en', 'fr'])
		expect(en).toBe(before)
		expect(fr).toBe('Bonjour Ann')
	})

	it('leaves a <T> with named slot children to the runtime component', async () => {
		for (const markup of [
			'<T><svelte:fragment slot="other">hidden</svelte:fragment>shown</T>',
			'<T><span slot="other">hidden</span>shown</T>',
		]) {
			expect(sources(markup)).toStrictEqual([])
			const { baseline, code } = await parity(markup)
			expect(baseline).toBe('shown')
			expect(code).toContain(markup)
		}
	})

	it('keeps script and style bodies opaque', async () => {
		const cases = [
			['<T><style>p { color: red }</style>hello</T>', '<1/>hello', '<style>p { color: red }</style>'],
			[
				'<T>hello<script type="application/ld+json">{"a": 1}</script></T>',
				'hello<1/>',
				'<script type="application/ld+json">{"a": 1}</script>',
			],
		] as const

		for (const [markup, source, raw] of cases) {
			expect(sources(markup)).toStrictEqual([source])

			const { baseline, fr, code } = await parity(markup)
			expect(code).toContain(raw)
			expect(baseline).toContain(raw)
			expect(fr).toContain(raw)
			expect(fr).toContain('HELLO')
		}
	})
})

describe('children snippet identity and import aliases', () => {
	it('keeps the children snippet declaration, so it can refer to itself', async () => {
		const { baseline, code } = await parity('<T>{#snippet children()}<p>{children.name}</p>{/snippet}</T>')
		expect(baseline).toBe('<p>children</p>')
		expect(code).toContain(
			'{#if true}{#snippet children()}<p>{children.name}</p>{/snippet}{@render children()}{/if}'
		)

		const recursive = await parity(
			'<T>{#snippet children(n = 2)}{#if n > 0}<Badge count={n}>{@render children(n - 1)}</Badge>{:else}done{/if}{/snippet}</T>'
		)
		expect(recursive.baseline).toBe(
			'<span class="badge" data-count="2"><span class="badge" data-count="1">done</span></span>'
		)
		expect(recursive.fr).toContain('DONE')
	})

	it('resolves every default import alias on its own', async () => {
		const imports = "import T from '@awsless/i18n/T'\n\timport Translate from '@awsless/i18n/T'"
		const page = (markup: string) => `<script>\n\t${imports}\n\tlet { list } = $props()\n</script>\n${markup}\n`
		const translate = table({ Hello: { fr: 'Bonjour' }, World: { fr: 'Monde' } })

		const both = page('<T>Hello</T><Translate>World</Translate>')
		expect(findSvelteTranslatable(both).map(item => item.source)).toStrictEqual(['Hello', 'World'])

		const { code } = await transform(both, translate)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('HelloWorld')
		expect(fr).toBe('BonjourMonde')

		const shadowed = page('{#each list as T}<T/><Translate>World</Translate>{/each}')
		expect(findSvelteTranslatable(shadowed).map(item => item.source)).toStrictEqual(['World'])
		const result = await transform(shadowed, translate)
		expect(result.code).toContain(
			'{#each list as T}<T/>{#if true}{__i18n_lang.t.pick(["World"], {"fr":["Monde"]})}{/if}{/each}'
		)
		expect(() => compile(result.code, { generate: 'client' })).not.toThrow()
	})
})

describe('computed members and slot scoped let:', () => {
	it('ignores lang[t] and only rewrites lang.t', async () => {
		const markup = [
			'<script>',
			"\timport T from '@awsless/i18n/T'",
			"\tconst t = 'other'",
			"\tconst lang = { other: () => 'Other' }",
			'</script>',
			'<p>{lang[t]`Hello`}</p><T>Hi</T>',
			'',
		].join('\n')

		expect(findSvelteTranslatable(markup)).toStrictEqual([{ source: 'Hi', kind: 'markup' }])

		const { code } = await transform(markup, table({ Hello: { fr: 'Bonjour' }, Hi: { fr: 'Salut' } }))
		expect(code).toContain('<p>{lang[t]`Hello`}</p>')
		expect(() => compile(code, { generate: 'client' })).not.toThrow()

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('<p>Other</p>Hi')
		expect(fr).toBe('<p>Other</p>Salut')

		const ts = "const t = 'other'\nexport const a = lang[t]`x`\nexport const b = lang.t`y`\n"
		expect(findTypescriptTranslatable(ts)).toStrictEqual([{ source: 'y', kind: 't' }])
		const result = await transform(ts, table({ x: { fr: 'X' }, y: { fr: 'Y' } }), undefined, 'lib.ts')
		expect(result.code).toBe(
			'const t = \'other\'\nexport const a = lang[t]`x`\nexport const b = lang.t.get(`y`, {"fr":`Y`})\n'
		)
	})

	it('scopes let: bindings to the default slot only', async () => {
		const slotted = component('<Panel let:T><T slot="heading">Hello</T></Panel>')
		expect(findSvelteTranslatable(slotted).map(item => item.source)).toStrictEqual(['Hello'])

		const { code } = await transform(slotted, table({ Hello: { fr: 'Bonjour' } }))
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
		const [en, fr] = await ssr(code, {}, ['en', 'fr'])
		expect(en).toBe('<header>Hello</header><main></main>')
		expect(fr).toBe('<header>Bonjour</header><main></main>')

		const shadowed = component('<Panel let:T><T>Hello</T></Panel>')
		expect(findSvelteTranslatable(shadowed)).toStrictEqual([])
		expect((await transform(shadowed, upper)).code).toBe(shadowed)
	})
})

describe('let: destructuring shadows the import', () => {
	// The inner <T> is the slot-provided component, so nothing may change.
	const untouched = async (markup: string, expected: string) => {
		const code = component(markup)
		expect(findSvelteTranslatable(code)).toStrictEqual([])

		const [before] = await ssr(code, {}, ['en'])
		expect(before).toBe(expected)

		const result = await transform(code, table({}))
		expect(result.code).toBe(code)
		expect(() => compile(result.code, { generate: 'client' })).not.toThrow()
		expect((await ssr(result.code, {}, ['en']))[0]).toBe(expected)
	}

	it('in the default slot', async () => {
		const main = '<header></header><main><i>inner</i></main>'
		await untouched('<Host let:item={{ Widget: T }}><T>Fallback</T></Host>', main)
		await untouched('<Host let:list={[T]}><T>Fallback</T></Host>', main)
		await untouched('<Host let:deep={{ a: { b: T } }}><T>Fallback</T></Host>', main)
		await untouched('<Host let:list={[, T]}><T>Fallback</T></Host>', main)
		await untouched('<Host let:list={[T = Inner]}><T>Fallback</T></Host>', main)
	})

	it('in a named slot', async () => {
		const heading = '<header><i>inner</i></header><main></main>'
		await untouched(
			'<Host><svelte:fragment slot="heading" let:item={{ Widget: T }}><T>Fallback</T></svelte:fragment></Host>',
			heading
		)
		await untouched(
			'<Host><svelte:fragment slot="heading" let:list={[, T]}><T>Fallback</T></svelte:fragment></Host>',
			heading
		)
	})

	it('through rest elements', () => {
		expect(sources('<Host let:list={[...T]}><T>Fallback</T></Host>')).toStrictEqual([])
		expect(sources('<Host let:item={{ ...T }}><T>Fallback</T></Host>')).toStrictEqual([])
		expect(sources('<Host let:item={{ Widget: other }}><T>Hello</T></Host>')).toStrictEqual(['Hello'])
	})
})

describe('T.svelte', () => {
	it('compiles and renders without children', async () => {
		const source = await readFile(resolve(__dirname, '../src/T.svelte'), 'utf8')

		expect(() => compile(source, { generate: 'client', filename: 'T.svelte' })).not.toThrow()
		expect(() => compile(source, { generate: 'server', filename: 'T.svelte' })).not.toThrow()
	})
})
