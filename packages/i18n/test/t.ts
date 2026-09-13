import { mkdtemp, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import { i18n, Translator } from '../src'
import { loadCache } from '../src/cache'
import { findSvelteTranslatable } from '../src/find/svelte'
import { findTComponents, validateTranslation } from '../src/t'

const serialize = (markup: string) => findTComponents(markup).flatMap(item => item.segments.map(s => s.source))

const example = 'Hello <1>${0}</1>, you have <2>${1} items</2>. <3/>'
const exampleMarkup = '<T>Hello <b class="x">{name}</b>, you have <Badge count={n}>{n} items</Badge>. <Icon/></T>'

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
const transform = async (file: string, code: string, translate: Translator, override?: Record<string, unknown>) => {
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

		return { code: (result?.code ?? code) as string, map: result?.map, warn, cache: await loadCache(cwd) }
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
		'\tlet { name, n, items, html, s } = $props()',
		'</script>',
		'',
		markup,
		'',
	].join('\n')
}

const BADGE =
	'<script>let { count, children } = $props()</script><span class="badge" data-count={count}>{@render children()}</span>'
const ICON = '<i>*</i>'
const CARD = '<script>let { item = "X" } = $props()</script><div class="card"><slot {item} /></div>'

// Compiles for the server and renders once per locale with a stub `lang`
// module, since the real one needs the svelte plugin to compile its runes.
const ssr = async (code: string, props: Record<string, unknown>, locales: string[]) => {
	const dir = await mkdtemp(resolve(tmpdir(), 'awsless-i18n-ssr-'))
	const internal = createRequire(import.meta.url).resolve('svelte/internal/server')

	const emit = async (name: string, source: string) => {
		const js = compile(source, { generate: 'server', filename: `${name}.svelte` }).js.code
		await writeFile(
			resolve(dir, `${name}.js`),
			js
				.replace("'svelte/internal/server'", JSON.stringify(internal))
				.replace(/'@awsless\/i18n\/svelte'/g, "'./lang.js'")
				.replace(/'@awsless\/i18n\/T'/g, "'./T.js'")
				.replace(/\.svelte'/g, ".js'")
		)
	}

	// The locale lives on globalThis, so it doesn't matter which module
	// instance of the stub the page ends up importing.
	await writeFile(
		resolve(dir, 'lang.js'),
		'export const lang = { t: { get: (og, translations) => translations[globalThis.__locale] ?? og } }\n'
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

describe('<T> serializer', () => {
	it('text', () => {
		expect(serialize('<T>Hello world</T>')).toStrictEqual(['Hello world'])
	})

	it('expressions become indexed placeholders', () => {
		expect(serialize('<T>Hello {name}!</T>')).toStrictEqual(['Hello ${0}!'])
		expect(serialize('<T>{fn({ a: 1 })} {"}"} {(/[{}]/).test(s)}</T>')).toStrictEqual(['${0} ${1} ${2}'])
		expect(findTComponents('<T>{a} {b}</T>')[0]?.segments[0]?.expressions).toStrictEqual(['a', 'b'])
	})

	it('nested element, component with props and self-closing', () => {
		expect(serialize(exampleMarkup)).toStrictEqual([example])
	})

	it('childless element and comments', () => {
		expect(serialize('<T>a <b></b> <!-- note --> b</T>')).toStrictEqual(['a <1/> b'])
	})

	it('numbers tags depth-first', () => {
		expect(serialize('<T><a>x <b>y</b></a> <i/></T>')).toStrictEqual(['<1>x <2>y</2></1> <3/>'])
	})

	it('collapses whitespace', () => {
		expect(serialize('<T>\n\tHello\n\t<b>\n\t\tworld\n\t</b>\n</T>')).toStrictEqual(['Hello <1> world </1>'])
	})

	it('keeps whitespace in pre, textarea, preserveWhitespace and non-breaking spaces', () => {
		expect(serialize('<T>Hi <pre>Hello\n  world</pre></T>')).toStrictEqual(['Hi <1>Hello\n  world</1>'])
		expect(serialize('<T><textarea>a\n\nb</textarea></T>')).toStrictEqual(['<1>a\n\nb</1>'])
		expect(serialize('<pre><T>a\n  b</T></pre>')).toStrictEqual(['a\n  b'])
		expect(serialize('<svelte:options preserveWhitespace={true} /><T>\n a  b\n</T>')).toStrictEqual(['\n a  b\n'])
		expect(serialize('<T>a&nbsp;b  c&amp;d</T>')).toStrictEqual(['a b  c&d'])
	})

	it('finds <T> inside markup and blocks', () => {
		expect(serialize('<div>{#if x}<Card><T>inner</T></Card>{/if}</div>')).toStrictEqual(['inner'])
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
	it('accepts moved text and kept structure', () => {
		expect(
			validateTranslation(example, 'Bonjour <1>${0}</1>, vous avez <2>${1} articles</2>. <3/>')
		).toBeUndefined()
		expect(validateTranslation('<1>a</1> b', '<1></1> a b')).toBeUndefined()
		expect(validateTranslation('${0} ${1}', '${1} ${0}')).toBeUndefined()
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
	})
})

describe('<T> transform', () => {
	it('replaces text runs and leaves the markup alone', async () => {
		const { code, map } = await transform(
			'page.svelte',
			component(exampleMarkup),
			table({
				[example]: { fr: 'Bonjour <1>${0}</1>, vous avez <2>${1} articles</2>. <3/>' },
			})
		)

		expect(code).toContain(
			'{lang.t.get(`Hello `, {"fr":`Bonjour `})}<b class="x">{name}</b>' +
				'{lang.t.get(`, you have `, {"fr":`, vous avez `})}<Badge count={n}>{lang.t.get(`${n} items`, {"fr":`${n} articles`})}</Badge>. <Icon/>'
		)
		expect(code).not.toContain('<T')
		expect(code).not.toContain('lang.locale')
		expect(code.match(/<Badge/g)).toHaveLength(1)
		expect(map.mappings).toBeTypeOf('string')

		expect(() => compile(code, { generate: 'client', filename: 'page.svelte' })).not.toThrow()
	})

	it('reconstructs the block example', async () => {
		const source = '<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>'
		const { code } = await transform(
			'page.svelte',
			component(source),
			table({
				'You have <1/> left.': { fr: 'Il vous reste <1/>.' },
				'no items': { fr: 'aucun article' },
				'<1>${0}</1> items': { fr: '<1>${0}</1> articles' },
			})
		)

		expect(code).toContain(
			'{lang.t.get(`You have `, {"fr":`Il vous reste `})}' +
				'{#if n === 0}{lang.t.get(`no items`, {"fr":`aucun article`})}{:else}<b>{n}</b>{lang.t.get(` items`, {"fr":` articles`})}{/if}' +
				'{lang.t.get(` left.`, {"fr":`.`})}'
		)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('injects the lang import once', async () => {
		const translate = table({ Hello: { fr: 'Bonjour' } })
		const expected = "<script>\n\timport { lang } from '@awsless/i18n/svelte'\n\timport T from '@awsless/i18n/T'"

		const missing = await transform('page.svelte', component('<T>Hello</T>'), translate)
		expect(missing.code).toContain(expected)

		const present = await transform(
			'page.svelte',
			component('<T>Hello</T>', "import T from '@awsless/i18n/T'\n\timport { lang } from '@awsless/i18n/svelte'"),
			translate
		)
		expect(present.code.match(/import \{ lang \}/g)).toHaveLength(1)

		const noScript = await transform('page.svelte', '<p><T>Hello</T></p>\n', translate)
		expect(noScript.code).toBe(
			'<script>\n\timport { lang } from \'@awsless/i18n/svelte\'\n</script>\n<p>{lang.t.get(`Hello`, {"fr":`Bonjour`})}</p>\n'
		)
		expect(() => compile(noScript.code, { generate: 'client' })).not.toThrow()
	})

	it('unwraps <T> without translations and skips the import', async () => {
		const { code } = await transform('page.svelte', component('<p><T>Hello <b>{name}</b></T></p>'), table({}))

		expect(code).toContain('<p>Hello <b>{name}</b></p>')
		expect(code).not.toContain('import { lang }')
	})

	it('drops a broken translation with a warning and keeps the source', async () => {
		const { code, warn, cache } = await transform(
			'page.svelte',
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
		expect(code).toContain('{lang.t.get(`Hello `, {"jp":`こんにちは `})}')
	})

	it('warns about a broken override and keeps the source', async () => {
		const { code, warn } = await transform('page.svelte', component(exampleMarkup), table({}), {
			[example]: { jp: 'こんにちは <1>${0}</1>、<2>${1} 件</2>' },
		})

		expect(warn).toHaveBeenCalledTimes(1)
		expect(code).toContain('Hello <b class="x">{name}</b>, you have')
	})

	it('escapes backticks and dollar braces in text', async () => {
		const { code } = await transform(
			'page.svelte',
			component('<T>a ` b &#36;&#123;c&#125; \\ d</T>'),
			table({ 'a ` b ${c} \\ d': { fr: 'x ` y ${c} \\ z' } })
		)

		expect(code).toContain('{lang.t.get(`a \\` b \\${c} \\\\ d`, {"fr":`x \\` y \\${c} \\\\ z`})}')
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('still rewrites lang.t next to and inside a <T>', async () => {
		const { code } = await transform(
			'page.svelte',
			component('<T>Hello {lang.t`x`}</T>\n<p>{lang.t`Bye`}</p>', "import { lang } from '@awsless/i18n/svelte'"),
			table({ 'Hello ${0}': { fr: 'Bonjour ${0}' }, Bye: { fr: 'Au revoir' }, x: { fr: 'y' } })
		)

		expect(code).toContain(
			'{lang.t.get(`Hello ${lang.t.get(`x`, {"fr":`y`})}`, {"fr":`Bonjour ${lang.t.get(`x`, {"fr":`y`})}`})}'
		)
		expect(code).toContain('<p>{lang.t.get(`Bye`, {"fr":`Au revoir`})}</p>')
	})
})

describe('<T> server render', () => {
	it('switches locale with exactly one nested component instance', async () => {
		const { code } = await transform(
			'page.svelte',
			component(exampleMarkup),
			table({ [example]: { fr: 'Bonjour <1>${0}</1>, vous avez <2>${1} articles</2>. <3/>' } })
		)

		const [en, fr] = await ssr(code, { name: 'Ann', n: 3 }, ['en', 'fr'])

		expect(en).toBe(
			'Hello <b class="x">Ann</b>, you have <span class="badge" data-count="3">3 items</span>. <i>*</i>'
		)
		expect(fr).toBe(
			'Bonjour <b class="x">Ann</b>, vous avez <span class="badge" data-count="3">3 articles</span>. <i>*</i>'
		)
		expect(code.match(/<Badge/g)).toHaveLength(1)
	})

	it('renders braces and regex literals inside expressions', async () => {
		const markup = '<T>Got {"}"} and {(/[{}]/).test(s) ? "braces" : "none"}!</T>'
		const { code } = await transform(
			'page.svelte',
			component(markup),
			table({ 'Got ${0} and ${1}!': { fr: 'Reçu ${1} et ${0} !' } })
		)

		const [en, fr] = await ssr(code, { s: '{x}' }, ['en', 'fr'])

		expect(en).toBe('Got } and braces!')
		expect(fr).toBe('Reçu braces et } !')
	})

	it('keeps a placeholder inside its let: scope', async () => {
		const markup = '<T><Card let:item>Hello {item}</Card></T>'
		const { code, warn } = await transform(
			'page.svelte',
			component(markup),
			table({ '<1>Hello ${0}</1>': { fr: '${0} <1>Bonjour</1>' } })
		)

		expect(warn).toHaveBeenCalledTimes(1)

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])

		expect(en).toBe('<div class="card">Hello X</div>')
		expect(fr).toBe(en)
	})

	it('preserves whitespace in pre', async () => {
		const markup = '<T>Code: <pre>Hello\n  world</pre></T>'
		const { code } = await transform(
			'page.svelte',
			component(markup),
			table({ 'Code: <1>Hello\n  world</1>': { fr: 'Code : <1>Bonjour\n  le monde</1>' } })
		)

		const [en, fr] = await ssr(code, {}, ['en', 'fr'])

		expect(en).toBe('Code: <pre>Hello\n  world</pre>')
		expect(fr).toBe('Code : <pre>Bonjour\n  le monde</pre>')
	})

	it('preserves non-breaking spaces', async () => {
		const { code } = await transform(
			'page.svelte',
			component('<T>Hello&nbsp;{name} !</T>'),
			table({ 'Hello ${0} !': { fr: 'Bonjour ${0} !' } })
		)

		const [en, fr] = await ssr(code, { name: 'Ann' }, ['en', 'fr'])

		expect(en).toBe('Hello Ann !')
		expect(fr).toBe('Bonjour Ann !')
	})

	it('renders nothing for an empty <T>', async () => {
		const { code } = await transform('page.svelte', component('<p><T/><T></T><T>\n</T></p>'), table({}))

		expect(code).not.toContain('<T')

		const [en] = await ssr(code, {}, ['en'])

		expect(en).toBe('<p></p>')
	})

	it('renders an explicit children snippet body', async () => {
		const markup = '<T>\n\t{#snippet children()}Hello <b>{name}</b>{/snippet}\n</T>'
		const { code } = await transform(
			'page.svelte',
			component(markup),
			table({ 'Hello <1>${0}</1>': { fr: 'Bonjour <1>${0}</1>' } })
		)

		expect(code).not.toContain('{#snippet')

		const [en, fr] = await ssr(code, { name: 'Ann' }, ['en', 'fr'])

		expect(en).toBe('Hello <b>Ann</b>')
		expect(fr).toBe('Bonjour <b>Ann</b>')
	})

	it('renders translated block bodies in place', async () => {
		const source = '<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>'
		const { code } = await transform(
			'page.svelte',
			component(source),
			table({
				'You have <1/> left.': { fr: 'Il vous reste <1/>.' },
				'no items': { fr: 'aucun article' },
				'<1>${0}</1> items': { fr: '<1>${0}</1> articles' },
			})
		)

		const [en, fr] = await ssr(code, { n: 2 }, ['en', 'fr'])

		expect(en).toBe('You have <b>2</b> items left.')
		expect(fr).toBe('Il vous reste <b>2</b> articles.')
	})
})

describe('T.svelte', () => {
	it('compiles and renders without children', async () => {
		const { readFile } = await import('fs/promises')
		const source = await readFile(resolve(__dirname, '../src/T.svelte'), 'utf8')

		expect(() => compile(source, { generate: 'client', filename: 'T.svelte' })).not.toThrow()
		expect(() => compile(source, { generate: 'server', filename: 'T.svelte' })).not.toThrow()
	})
})
