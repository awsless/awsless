import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { compile } from 'svelte/compiler'
import { i18n, Translator } from '../src'
import { loadCache } from '../src/cache'
import { findSvelteTranslatable } from '../src/find/svelte'
import { findTComponents, validateTranslation } from '../src/t'

const serialize = (markup: string) => findTComponents(markup).map(item => item.segment.source)

const example = 'Hello <1>${name}</1>, you have <2>${n} items</2>. <3/>'

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

		return { code: result.code as string, map: result.map, warn, cache: await loadCache(cwd) }
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
		'\tlet { name, n, items, html } = $props()',
		'</script>',
		'',
		markup,
		'',
	].join('\n')
}

describe('<T> serializer', () => {
	it('text', () => {
		expect(serialize('<T>Hello world</T>')).toStrictEqual(['Hello world'])
	})

	it('expression', () => {
		expect(serialize('<T>Hello {name}!</T>')).toStrictEqual(['Hello ${name}!'])
		expect(serialize('<T>{fn({ a: 1 })}</T>')).toStrictEqual(['${fn({ a: 1 })}'])
	})

	it('nested element, component with props and self-closing', () => {
		expect(
			serialize('<T>Hello <b>{name}</b>, you have <Badge count={n}>{n} items</Badge>. <Icon/></T>')
		).toStrictEqual([example])
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

		expect(findSvelteTranslatable(code)).toStrictEqual(['You have <1/> left.', 'no items', '<1>${n}</1> items'])
	})

	it('each with else', () => {
		const code = '<T>Items: {#each items as item, i (item.id)}<li>{item.name}</li>{:else}No items{/each}</T>'

		expect(findSvelteTranslatable(code)).toStrictEqual(['Items: <1/>', '<1>${item.name}</1>', 'No items'])
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
			'got ${v}',
			'<1>keyed</1>',
		])
	})

	it('html, render and const produce no segment', () => {
		const code = '<T>{@const x = 1}Hi {@html html} {@render s()}</T>'

		expect(findSvelteTranslatable(code)).toStrictEqual(['<1/>Hi <2/> <3/>'])
	})

	it('skips empty <T>', () => {
		expect(findSvelteTranslatable('<T></T><T />')).toStrictEqual([])
	})
})

describe('<T> validation', () => {
	it('accepts reordered tags and placeholders', () => {
		expect(validateTranslation(example, 'Vous avez <2>${n} articles</2>, <1>${name}</1>. <3/>')).toBeUndefined()
	})

	it('rejects dropped or broken tags and placeholders', () => {
		expect(validateTranslation(example, 'Bonjour <1>${name}</1>, <2>${n} articles</2>.')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${nom}</1>, <2>${n} articles</2>. <3/>')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${name}, <2>${n} articles</1></2>. <3/>')).toBeDefined()
		expect(validateTranslation(example, 'Bonjour <1>${name}</1>, <2>${n} articles</2>. <3></3>')).toBeDefined()
		expect(validateTranslation('Hello ${name}', 'Bonjour ${name} ${name}')).toBeDefined()
		expect(validateTranslation('<1>a</1> <2>b</2>', '<1>a <2>b</2></1>')).toBeDefined()
	})
})

describe('<T> transform', () => {
	const markup = '<T>Hello <b class="x">{name}</b>, you have <Badge count={n}>{n} items</Badge>. <Icon/></T>'

	it('emits a branch per translated locale reusing the original tags', async () => {
		const { code, map } = await transform(
			'page.svelte',
			component(markup),
			table({
				[example]: { fr: 'Bonjour <1>${name}</1>, vous avez <2>${n} articles</2>. <3/>' },
			})
		)

		expect(code).toContain(
			'{#if lang.locale === \'fr\'}Bonjour <b class="x">{name}</b>, vous avez <Badge count={n}>{n} articles</Badge>. <Icon/>' +
				'{:else}Hello <b class="x">{name}</b>, you have <Badge count={n}>{n} items</Badge>. <Icon/>{/if}'
		)
		expect(code).not.toContain('<T>')
		expect(code).not.toContain("lang.locale === 'jp'")
		expect(map.mappings).toBeTypeOf('string')

		expect(() => compile(code, { generate: 'client', filename: 'page.svelte' })).not.toThrow()
	})

	it('omits a tag the translation dropped', async () => {
		const { code } = await transform('page.svelte', component(markup), table({}), {
			[example]: { jp: 'こんにちは <1>${name}</1>、<2>${n} 件</2>' },
		})

		expect(code).toContain(
			'{#if lang.locale === \'jp\'}こんにちは <b class="x">{name}</b>、<Badge count={n}>{n} 件</Badge>{:else}Hello'
		)
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
			"<script>\n\timport { lang } from '@awsless/i18n/svelte'\n</script>\n<p>{#if lang.locale === 'fr'}Bonjour{:else}Hello{/if}</p>\n"
		)
		expect(() => compile(noScript.code, { generate: 'client' })).not.toThrow()
	})

	it('leaves <T> alone without translations', async () => {
		const code = component('<T>Hello</T>')
		const result = await transform('page.svelte', code, table({}))

		expect(result.code).toBe(code)
	})

	it('falls back to the source when a translation breaks the tags', async () => {
		const { code, warn, cache } = await transform(
			'page.svelte',
			component(markup),
			table({
				[example]: {
					fr: 'Bonjour <1>${name}</1>, vous avez <2>${n} articles</2>.',
					jp: 'こんにちは <1>${name}</1>、<2>${n} 件</2>。<3/>',
				},
			})
		)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain(`"fr" translation of "${example}"`)
		expect(cache.get(example, 'fr')).toBeUndefined()
		expect(cache.get(example, 'jp')).toBeTypeOf('string')
		expect(code).not.toContain("lang.locale === 'fr'")
		expect(code).toContain("{#if lang.locale === 'jp'}こんにちは")
	})

	it('reconstructs blocks with translated bodies', async () => {
		const source = '<T>You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.</T>'
		const { code } = await transform(
			'page.svelte',
			component(source),
			table({
				'You have <1/> left.': { fr: 'Il vous reste <1/>.' },
				'no items': { fr: 'aucun article' },
				'<1>${n}</1> items': { fr: '<1>${n}</1> articles' },
			})
		)

		expect(code).toContain(
			"{#if lang.locale === 'fr'}Il vous reste {#if n === 0}aucun article{:else}<b>{n}</b> articles{/if}." +
				'{:else}You have {#if n === 0}no items{:else}<b>{n}</b> items{/if} left.{/if}'
		)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('translates a block body even when the parent text is unchanged', async () => {
		const source = '<T>{#each items as item, i (item.id)}\n\t<li>{item.name}</li>\n{:else}\n\tNo items\n{/each}</T>'
		const { code } = await transform(
			'page.svelte',
			component(source),
			table({
				'<1>${item.name}</1>': { fr: '<1>${item.name} !</1>' },
				'No items': { fr: 'Aucun article' },
			})
		)

		expect(code).toContain(
			"{#if lang.locale === 'fr'}{#each items as item, i (item.id)}<li>{item.name} !</li>{:else}Aucun article{/each}" +
				'{:else}{#each items as item, i (item.id)}\n\t<li>{item.name}</li>\n{:else}\n\tNo items\n{/each}{/if}'
		)
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('copies html tags verbatim', async () => {
		const source = '<T>Hi {@html html} there</T>'
		const { code } = await transform(
			'page.svelte',
			component(source),
			table({
				'Hi <1/> there': { fr: 'Salut <1/> toi' },
			})
		)

		expect(code).toContain("{#if lang.locale === 'fr'}Salut {@html html} toi{:else}Hi {@html html} there{/if}")
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('escapes braces in translated text', async () => {
		const { code } = await transform(
			'page.svelte',
			component('<T>Hello</T>'),
			table({ Hello: { fr: 'Bon{jour}' } })
		)

		expect(code).toContain("{#if lang.locale === 'fr'}Bon&#123;jour&#125;{:else}Hello{/if}")
		expect(() => compile(code, { generate: 'client' })).not.toThrow()
	})

	it('still rewrites lang.t next to a <T>', async () => {
		const { code } = await transform(
			'page.svelte',
			component('<T>Hello</T>\n<p>{lang.t`Bye`}</p>', "import { lang } from '@awsless/i18n/svelte'"),
			table({ Hello: { fr: 'Bonjour' }, Bye: { fr: 'Au revoir' } })
		)

		expect(code).toContain("{#if lang.locale === 'fr'}Bonjour{:else}Hello{/if}")
		expect(code).toContain('<p>{lang.t.get(`Bye`, {"fr":`Au revoir`})}</p>')
	})
})

describe('T.svelte', () => {
	it('compiles', async () => {
		const { readFile } = await import('fs/promises')
		const source = await readFile(resolve(__dirname, '../src/T.svelte'), 'utf8')

		expect(() => compile(source, { generate: 'client', filename: 'T.svelte' })).not.toThrow()
	})
})
