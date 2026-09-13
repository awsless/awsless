import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import { i18n, Translator } from '../src'
import { loadCache } from '../src/cache'
import { findSvelteTranslatable } from '../src/find/svelte'
import { findTComponents, serialize, tokenize, validateTranslation } from '../src/t'

const serializeT = (markup: string) => findTComponents(markup).flatMap(item => item.segments.map(s => s.source))

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
const transform = async (code: string, translate: Translator, override?: Record<string, unknown>) => {
	const cwd = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-t-'))
	const path = resolve(cwd, 'page.svelte')
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

const component = (markup: string, script = "import T from '@awsless/i18n/T'") => {
	return [
		'<script>',
		`\t${script}`,
		"\timport Badge from './badge.svelte'",
		"\timport Icon from './icon.svelte'",
		"\timport Card from './card.svelte'",
		'\tlet { name, n, items, html, s, a, b, p, k, next, rows, languages } = $props()',
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
	await writeFile(
		resolve(dir, 'T.js'),
		'export default function T($$renderer, $$props) { $$props.children?.($$renderer) }\n'
	)
	await emit('page', code)
	await emit('badge', BADGE)
	await emit('icon', ICON)
	await emit('card', CARD)

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
		expect(findTComponents('<T>{a} {b}</T>')[0]?.segments[0]?.expressions).toStrictEqual(['a', 'b'])
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
		expect(serializeT('<T>\n\tHello\n\t<b>\n\t\tworld\n\t</b>\n</T>')).toStrictEqual(['Hello <1> world </1>'])
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
		expect(() => findTComponents('<div>\n<T>a <T>b</T></T>\n</div>', 'page.svelte')).toThrow(
			'page.svelte:2: nested <T> is not supported inside <T>'
		)
	})

	it('blocks become self-closing tags with their own segments', () => {
		const code = '<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>'

		expect(findSvelteTranslatable(code)).toStrictEqual(['You have <1/> left.', 'no items', '<1>${0}</1> items'])
	})

	it('nested blocks', () => {
		expect(findSvelteTranslatable('<T>{#if a}{#if b}x{/if}{/if}</T>')).toStrictEqual(['<1/>', '<1/>', 'x'])
		expect(findSvelteTranslatable('<T>{#each rows as r}{#each r as c}{c}!{/each}{/each}</T>')).toStrictEqual([
			'<1/>',
			'<1/>',
			'${0}!',
		])
		expect(findSvelteTranslatable('<T>{#if a}{#if b}x{/if}{:else}y{/if} z</T>')).toStrictEqual([
			'<1/> z',
			'<1/>',
			'x',
			'y',
		])
	})

	it('each with else', () => {
		const code = '<T>Items: {#each items as item, i (item.id)}<li>{item.name}</li>{:else}No items{/each}</T>'

		expect(findSvelteTranslatable(code)).toStrictEqual(['Items: <1/>', '<1>${0}</1>', 'No items'])
	})

	it('else if chain, await and key', () => {
		const code = [
			'<T>',
			'{#if a}one{:else if b}two{:else}three{/if}',
			'{#await p}wait{:then v}got {v}{:catch e}{/await}',
			'{#key k}<b>keyed</b>{/key}',
			'</T>',
		].join('\n')

		expect(findSvelteTranslatable(code)).toStrictEqual([
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

		expect(findSvelteTranslatable(code)).toStrictEqual(['<1/>Hi <2/> <3/>'])
	})

	it('uses the body of an explicit children snippet', () => {
		const code = '<T>\n\t{#snippet children()}Hello <b>{name}</b>{/snippet}\n</T>'

		expect(findSvelteTranslatable(code)).toStrictEqual(['Hello <1>${0}</1>'])
		expect(findSvelteTranslatable('<T>{#snippet other()}Hi{/snippet}</T>')).toStrictEqual(['<1/>', 'Hi'])
	})

	it('skips empty <T>', () => {
		expect(findSvelteTranslatable('<T></T><T />')).toStrictEqual([])
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
				'<Badge count={n}>{__i18n_lang.t.pick([0," items"], {"fr":[0," articles"]}, [n])}</Badge>. <Icon/>' +
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
			component('<T>Hello</T>', "import T from '@awsless/i18n/T'\n\timport { lang } from '@awsless/i18n/svelte'"),
			translate
		)
		expect(present.code).toContain(head)
		expect(present.code.match(/@awsless\/i18n\/svelte/g)).toHaveLength(2)

		const sameLine = await transform('<script>let name = "Ann";</script><T>Hello</T>', translate)
		expect(sameLine.code).toContain(
			'<script>import { lang as __i18n_lang } from \'@awsless/i18n/svelte\';\nlet name = "Ann";</script>'
		)

		const noScript = await transform('<p><T>Hello</T></p>\n', translate)
		expect(noScript.code).toBe(
			"<script>\n\timport { lang as __i18n_lang } from '@awsless/i18n/svelte'\n</script>\n" +
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
			'{__i18n_lang.t.pick(["Hello ",0], {"fr":["Bonjour ",0]}, [lang.t.get(`x`, {"fr":`y`})])}'
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

		expect(code).not.toContain('{#snippet children()}')
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
			'<script>let name = "Ann";</script><T>Hello {name}</T>',
			table({ 'Hello ${0}': { fr: 'Bonjour ${0}' } })
		)

		expect(code).toContain("<script>import { lang as __i18n_lang } from '@awsless/i18n/svelte';\nlet name")
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
			'<script>let lang = "shadow"</script><T>Hello {lang}</T>',
			table({ 'Hello ${0}': { fr: 'Bonjour ${0}' } })
		)
		const [en, fr] = await ssr(code, {}, ['en', 'fr'])

		expect(en).toBe('Hello shadow')
		expect(fr).toBe('Bonjour shadow')
	})
})

describe('T.svelte', () => {
	it('compiles and renders without children', async () => {
		const source = await readFile(resolve(__dirname, '../src/T.svelte'), 'utf8')

		expect(() => compile(source, { generate: 'client', filename: 'T.svelte' })).not.toThrow()
		expect(() => compile(source, { generate: 'server', filename: 'T.svelte' })).not.toThrow()
	})
})
