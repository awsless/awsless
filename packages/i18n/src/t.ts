import lineColumn from 'line-column'
import { AST, parse } from 'svelte/compiler'

// Svelte puts offsets on every node, the estree types just don't declare them.
type Range = { start: number; end: number }
const range = (node: unknown) => node as Range

// The text between two tag boundaries, with `${n}` placeholders for expressions.
export type Run = Range & { source: string }

// One translatable string: the <T> children or a block branch body.
export type Segment = {
	source: string
	expressions: string[]
	runs: Run[]
}

export type TComponent = {
	/** The <T> tags themselves, or everything around an explicit children snippet body. */
	remove: Range[]
	segments: Segment[]
}

type Body = { nodes: AST.Fragment['nodes']; start: number; end: number }

export const hasT = (code: string) => /<T[\s/>]/.test(code)

// Only ASCII whitespace collapses, so a non-breaking space survives.
const collapse = (text: string) => text.replace(/[ \t\n\r\f]+/g, ' ')
const PRESERVE = new Set(['pre', 'textarea'])

const isBlank = (node: AST.Fragment['nodes'][number]) =>
	node.type === 'Comment' || (node.type === 'Text' && node.data.trim() === '')

export const parseT = (code: string, file?: string) => {
	const ast = parse(code, { modern: true })
	const components: TComponent[] = []
	const preserveAll = ast.options?.preserveWhitespace === true

	const fail = (offset: number, message: string) => {
		const position = lineColumn(code).fromIndex(offset)
		return new Error(`${file ?? 'component'}:${position?.line ?? 0}: ${message}`)
	}

	const tagEnd = (node: AST.ElementLike) => {
		const first = node.fragment.nodes[0]
		if (first) {
			return first.start
		}

		const last = node.attributes.at(-1)
		return code.indexOf('>', last ? last.end : node.start + node.name.length + 1) + 1
	}

	// Branch bodies of a block, found from the AST anchors around them.
	const blockBodies = (node: AST.Block): Body[] => {
		const bodies: { sepStart?: number; bodyStart: number; nodes: AST.Fragment['nodes'] }[] = []
		let closeStart = node.end

		const afterBrace = (from: number) => code.indexOf('}', from) + 1
		const separator = (keyword: string, body: AST.Fragment, next: number) =>
			code.lastIndexOf(`{:${keyword}`, body.nodes[0]?.start ?? next)

		switch (node.type) {
			case 'IfBlock': {
				closeStart = code.lastIndexOf('{/if', node.end)
				let current: AST.IfBlock = node

				while (true) {
					bodies.push({
						sepStart: current.elseif ? current.start : undefined,
						bodyStart: afterBrace(range(current.test).end),
						nodes: current.consequent.nodes,
					})

					const alternate = current.alternate
					const first = alternate?.nodes[0]

					if (!alternate) {
						break
					}

					if (first?.type === 'IfBlock' && first.elseif) {
						current = first
						continue
					}

					const sepStart = separator('else', alternate, closeStart)
					bodies.push({ sepStart, bodyStart: afterBrace(sepStart), nodes: alternate.nodes })
					break
				}
				break
			}
			case 'EachBlock': {
				closeStart = code.lastIndexOf('{/each', node.end)
				const anchor = Math.max(
					range(node.expression).end,
					node.context ? range(node.context).end : 0,
					node.key ? range(node.key).end : 0
				)

				bodies.push({ bodyStart: afterBrace(anchor), nodes: node.body.nodes })

				if (node.fallback) {
					const sepStart = separator('else', node.fallback, closeStart)
					bodies.push({ sepStart, bodyStart: afterBrace(sepStart), nodes: node.fallback.nodes })
				}
				break
			}
			case 'AwaitBlock': {
				closeStart = code.lastIndexOf('{/await', node.end)
				const order = (['pending', 'then', 'catch'] as const).filter(key => node[key])
				const patternOf = (key: string) => (key === 'then' ? node.value : key === 'catch' ? node.error : null)
				let next = closeStart

				for (let i = order.length - 1; i >= 0; i--) {
					const key = order[i]!
					const body = node[key]!
					const pattern = patternOf(key)

					if (i === 0) {
						// The first branch shares the opening tag, in the
						// shorthand form including its then/catch pattern.
						const anchor = Math.max(range(node.expression).end, pattern ? range(pattern).end : 0)
						bodies.unshift({ bodyStart: afterBrace(anchor), nodes: body.nodes })
					} else {
						const sepStart = separator(key, body, next)
						const anchor = pattern && range(pattern).start > sepStart ? range(pattern).end : sepStart
						bodies.unshift({ sepStart, bodyStart: afterBrace(anchor), nodes: body.nodes })
						next = sepStart
					}
				}
				break
			}
			case 'KeyBlock': {
				closeStart = code.lastIndexOf('{/key', node.end)
				bodies.push({ bodyStart: afterBrace(range(node.expression).end), nodes: node.fragment.nodes })
				break
			}
			case 'SnippetBlock': {
				closeStart = code.lastIndexOf('{/snippet', node.end)
				const anchor = Math.max(range(node.expression).end, ...node.parameters.map(p => range(p).end))
				bodies.push({ bodyStart: afterBrace(anchor), nodes: node.body.nodes })
				break
			}
		}

		return bodies.map((body, index) => ({
			nodes: body.nodes,
			start: body.bodyStart,
			end: bodies[index + 1]?.sepStart ?? closeStart,
		}))
	}

	// Serializes one body into its segment plus the segments of the blocks inside it.
	const segments = (body: Body, preserve: boolean): Segment[] => {
		type Item = { tag: string } | { run: Run & { preserve: boolean; text: string } }

		const items: Item[] = []
		const expressions: string[] = []
		const nested: Segment[] = []
		let tags = 0
		let run = { start: body.start, text: '', preserve }

		const open = (position: number, preserve: boolean) => {
			run = { start: position, text: '', preserve }
		}

		const close = (position: number) => {
			items.push({ run: { ...run, end: position, source: '' } })
		}

		const visit = (nodes: AST.Fragment['nodes'], preserve: boolean) => {
			for (const node of nodes) {
				switch (node.type) {
					case 'Text':
						run.text += node.data
						break
					case 'Comment':
						break
					case 'ExpressionTag':
						run.text += `\${${expressions.length}}`
						expressions.push(code.slice(range(node.expression).start, range(node.expression).end))
						break
					case 'HtmlTag':
					case 'RenderTag':
					case 'ConstTag':
					case 'DebugTag':
					case 'AttachTag':
					case 'DeclarationTag':
						close(node.start)
						items.push({ tag: `<${++tags}/>` })
						open(node.end, preserve)
						break
					case 'IfBlock':
					case 'EachBlock':
					case 'AwaitBlock':
					case 'KeyBlock':
					case 'SnippetBlock':
						close(node.start)
						items.push({ tag: `<${++tags}/>` })

						for (const branch of blockBodies(node)) {
							nested.push(...segments(branch, preserve))
						}

						open(node.end, preserve)
						break
					default: {
						if (node.type === 'Component' && node.name === 'T') {
							throw fail(node.start, 'nested <T> is not supported inside <T>')
						}

						const number = ++tags
						const last = node.fragment.nodes.at(-1)

						close(node.start)

						if (last) {
							items.push({ tag: `<${number}>` })
							open(tagEnd(node), preserve || PRESERVE.has(node.name))
							visit(node.fragment.nodes, preserve || PRESERVE.has(node.name))
							close(last.end)
							items.push({ tag: `</${number}>` })
						} else {
							items.push({ tag: `<${number}/>` })
						}

						open(node.end, preserve)
					}
				}
			}
		}

		visit(body.nodes, preserve)
		close(body.end)

		const runs = items.flatMap(item => ('run' in item ? [item.run] : []))
		const first = runs[0]!
		const last = runs.at(-1)!

		for (const run of runs) {
			run.source = run.preserve ? run.text : collapse(run.text)
		}

		// Only the outer edges trim, the spaces next to tags inside carry meaning.
		if (!first.preserve) {
			first.source = first.source.trimStart()
		}

		if (!last.preserve) {
			last.source = last.source.trimEnd()
		}

		const source = items.map(item => ('tag' in item ? item.tag : item.run.source)).join('')

		return [
			{ source, expressions, runs: runs.map(({ start, end, source }) => ({ start, end, source })) },
			...nested,
		]
	}

	const collect = (nodes: AST.Fragment['nodes'], preserve: boolean) => {
		for (const node of nodes) {
			if (node.type === 'Component' && node.name === 'T') {
				const children = node.fragment.nodes
				const content = children.filter(child => !isBlank(child))
				const only = content.length === 1 ? content[0] : undefined

				if (children.length === 0) {
					components.push({ remove: [node], segments: [] })
				} else if (only?.type === 'SnippetBlock' && only.expression.name === 'children') {
					// An explicit children snippet is the content, so its body
					// stays and the snippet declaration goes with the tags.
					const body = blockBodies(only)[0]!
					components.push({
						remove: [
							{ start: node.start, end: body.start },
							{ start: body.end, end: node.end },
						],
						segments: segments(body, preserve),
					})
				} else {
					const body = { nodes: children, start: tagEnd(node), end: children.at(-1)!.end }
					components.push({
						remove: [
							{ start: node.start, end: body.start },
							{ start: body.end, end: node.end },
						],
						segments: segments(body, preserve),
					})
				}
				continue
			}

			const inside = preserve || ('name' in node && typeof node.name === 'string' && PRESERVE.has(node.name))

			for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
				const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]
				if (fragment?.type === 'Fragment') {
					collect(fragment.nodes, inside)
				}
			}
		}
	}

	collect(ast.fragment.nodes, preserveAll)

	return { ast, components }
}

export const findTComponents = (code: string, file?: string) => parseT(code, file).components

export const collectSources = (component: TComponent) =>
	component.segments.map(segment => segment.source).filter(source => source !== '')

// ---------------------------------------------------------------------------
// Source strings & translations: `text ${0} <1>text</1> <2/>`

type Gap = { text: string; placeholders: string[] }
type Shape = { tags: string[]; gaps: Gap[] }

// Placeholders never span braces, so a `}` in text can't swallow the rest.
const TOKEN = /\$\{([^{}]*)\}|<(\/?)(\d+)\s*(\/?)>/g

const shape = (text: string): Shape => {
	const tags: string[] = []
	const gaps: Gap[] = [{ text: '', placeholders: [] }]
	let cursor = 0

	for (const match of text.matchAll(TOKEN)) {
		const gap = gaps.at(-1)!
		gap.text += text.slice(cursor, match.index)
		cursor = match.index + match[0].length

		if (match[1] !== undefined) {
			gap.text += `\${${match[1]}}`
			gap.placeholders.push(match[1])
		} else if (match[2] && match[4]) {
			gap.text += match[0]
		} else {
			tags.push(match[2] ? `</${match[3]}>` : match[4] ? `<${match[3]}/>` : `<${match[3]}>`)
			gaps.push({ text: '', placeholders: [] })
		}
	}

	gaps.at(-1)!.text += text.slice(cursor)

	return { tags, gaps }
}

/** Returns what is wrong with the translation, or nothing when it keeps
 * the tags of the source in order and every placeholder in its own run. */
export const validateTranslation = (source: string, translation: string) => {
	const expected = shape(source)
	const actual = shape(translation)

	if (expected.tags.join('') !== actual.tags.join('')) {
		return 'the numbered tags differ from the source'
	}

	for (const [index, gap] of expected.gaps.entries()) {
		const placeholders = actual.gaps[index]!.placeholders

		if (gap.placeholders.toSorted().join(' ') !== placeholders.toSorted().join(' ')) {
			return 'a placeholder is missing, duplicated or moved across a tag'
		}
	}

	return
}

// ---------------------------------------------------------------------------
// Emitting: each run becomes `{lang.t.get(`source`, {"fr":`translation`})}`

export type Edit = Range & { text: string }
export type Lookup = (source: string, locale: string) => string | undefined

const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const literal = (text: string, expressions: string[]) => {
	const parts = text.split(/(\$\{\d+\})/).map((part, index) => {
		if (index % 2 === 0) {
			return escape(part)
		}

		const expression = expressions[Number(part.slice(2, -1))]

		if (expression === undefined) {
			throw new Error(`Placeholder ${part} does not exist in the source.`)
		}

		return `\${${expression}}`
	})

	return `\`${parts.join('')}\``
}

/** The edits turning a <T> into its children with translated text runs.
 * An edit without text removes, one without length inserts. */
export const transformT = (
	component: TComponent,
	locales: string[],
	lookup: Lookup,
	warn: (message: string) => void
) => {
	const edits: Edit[] = component.remove.map(({ start, end }) => ({ start, end, text: '' }))

	for (const segment of component.segments) {
		if (segment.source === '') {
			continue
		}

		const expected = shape(segment.source)

		if (expected.gaps.length !== segment.runs.length) {
			warn(`Skipped "${segment.source}": its text looks like a placeholder or numbered tag.`)
			continue
		}

		const translations: { locale: string; gaps: Gap[] }[] = []

		for (const locale of locales) {
			const translation = lookup(segment.source, locale)

			if (translation === undefined || translation === segment.source) {
				continue
			}

			// Overrides from i18n.json never went through translateNow.
			const problem = validateTranslation(segment.source, translation)

			if (problem) {
				warn(`Skipped the "${locale}" translation of "${segment.source}": ${problem}.`)
				continue
			}

			translations.push({ locale, gaps: shape(translation).gaps })
		}

		for (const [index, run] of segment.runs.entries()) {
			const changed = translations.filter(item => item.gaps[index]!.text !== run.source)

			if (changed.length === 0) {
				continue
			}

			const values = changed.map(
				item => `"${item.locale}":${literal(item.gaps[index]!.text, segment.expressions)}`
			)

			edits.push({
				start: run.start,
				end: run.end,
				text: `{lang.t.get(${literal(run.source, segment.expressions)}, {${values.join(',')}})}`,
			})
		}
	}

	return edits
}
