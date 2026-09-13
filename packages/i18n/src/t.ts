import lineColumn from 'line-column'
import { AST, parse } from 'svelte/compiler'

// Svelte puts offsets on every node, the estree types just don't declare them.
type Range = { start: number; end: number }
const range = (node: unknown) => node as Range

// Tokens are the one shape shared by the <T> children, the string the
// translator sees and the translation that comes back.
export type Token =
	| { type: 'text'; value: string }
	| { type: 'expr'; index: number }
	| { type: 'open' | 'close' | 'self'; n: number }

// What Svelte's clean_nodes knows about the body a text node sits in.
type Context = { preserve: boolean; removable: boolean; pre: boolean; svg: boolean; svgText: boolean }

type Piece = Range & {
	token: Token
	/** Svelte hoists these nodes out of the body, so they don't take part in whitespace. */
	hoisted?: boolean
	/** The body an `open` token starts. */
	body?: Context
}

// The text between two tag boundaries: translated and emitted as one call.
export type Run = Range & { tokens: Token[] }

// One translatable string: the <T> children or a block branch body.
export type Segment = {
	source: string
	tokens: Token[]
	expressions: Range[]
	runs: Run[]
}

export type TComponent = Range & {
	/** The pieces of the <T> that make way for the block scope. Absent when empty. */
	wrap?: { open: Range; close: Range; head: string; tail: string; foot: string }
	/** Tags of direct `<svelte:fragment>` children, meaningless outside a component. */
	remove: Range[]
	segments: Segment[]
}

export const hasT = (code: string) => /<T[\s/>]/.test(code)

// Mirrors svelte/compiler phases/3-transform/utils.js clean_nodes.
const PRESERVE = new Set(['pre', 'textarea'])
const REMOVABLE = new Set(['select', 'tr', 'table', 'tbody', 'thead', 'tfoot', 'colgroup', 'datalist'])
const HOISTED = new Set([
	'ConstTag',
	'DeclarationTag',
	'DebugTag',
	'SvelteBody',
	'SvelteWindow',
	'SvelteDocument',
	'SvelteHead',
	'TitleElement',
	'SnippetBlock',
])
const STARTS_WITH_WHITESPACE = /^[ \t\r\n]+/
const ENDS_WITH_WHITESPACE = /[ \t\r\n]+$/
const isBlankText = (value: string) => !/[^ \t\r\n]/.test(value)

// With children passed as a prop there is nothing to translate in the <T>
// itself; the runtime component renders it.
const hasPassedChildren = (node: AST.Component) =>
	node.attributes.some(
		attribute =>
			attribute.type === 'SpreadAttribute' || (attribute.type === 'Attribute' && attribute.name === 'children')
	)

const COMPONENTS = new Set(['Component', 'SvelteComponent', 'SvelteSelf'])

const isBlank = (node: AST.Fragment['nodes'][number]) =>
	node.type === 'Comment' || (node.type === 'Text' && isBlankText(node.data))

const rootContext = (preserve: boolean): Context => ({
	preserve,
	removable: false,
	pre: false,
	svg: false,
	svgText: false,
})

const childContext = (node: AST.ElementLike, parent: Context): Context => {
	const regular = node.type === 'RegularElement'
	const svg = parent.svg || (regular && node.name === 'svg')
	const svgText = parent.svgText || (regular && node.name === 'text')

	return {
		preserve: parent.preserve || (regular && PRESERVE.has(node.name)),
		removable: (regular && REMOVABLE.has(node.name)) || (svg && !svgText),
		pre: regular && node.name === 'pre',
		svg,
		svgText,
	}
}

export const parseT = (code: string, file?: string) => {
	const ast = parse(code, { modern: true })
	const components: TComponent[] = []
	const preserveAll = ast.options?.preserveWhitespace === true

	const fail = (offset: number, message: string) => {
		const position = lineColumn(code).fromIndex(offset)
		return new Error(`${file ?? 'component'}:${position?.line ?? 0}: ${message}`)
	}

	// Each branch body is a list of nodes, the syntax around it stays untouched.
	const blockBodies = (node: AST.Block): AST.Fragment['nodes'][] => {
		switch (node.type) {
			case 'IfBlock': {
				const first = node.alternate?.nodes[0]
				const rest = !node.alternate
					? []
					: first?.type === 'IfBlock' && first.elseif
						? blockBodies(first)
						: [node.alternate.nodes]

				return [node.consequent.nodes, ...rest]
			}
			case 'EachBlock':
				return node.fallback ? [node.body.nodes, node.fallback.nodes] : [node.body.nodes]
			case 'AwaitBlock':
				return [node.pending, node.then, node.catch].flatMap(body => (body ? [body.nodes] : []))
			case 'KeyBlock':
				return [node.fragment.nodes]
			case 'SnippetBlock':
				return [node.body.nodes]
		}
	}

	const build = (nodes: AST.Fragment['nodes'], context: Context): Segment[] => {
		const pieces: Piece[] = []
		const expressions: Range[] = []
		const nested: Segment[] = []
		let tags = 0

		const visit = (nodes: AST.Fragment['nodes'], context: Context) => {
			for (const node of nodes) {
				switch (node.type) {
					case 'Text':
						pieces.push({ start: node.start, end: node.end, token: { type: 'text', value: node.data } })
						break
					case 'Comment':
						break
					case 'ExpressionTag':
						pieces.push({
							start: node.start,
							end: node.end,
							token: { type: 'expr', index: expressions.length },
						})
						expressions.push({ start: range(node.expression).start, end: range(node.expression).end })
						break
					case 'HtmlTag':
					case 'RenderTag':
					case 'ConstTag':
					case 'DebugTag':
					case 'AttachTag':
					case 'DeclarationTag':
						pieces.push({
							start: node.start,
							end: node.end,
							token: { type: 'self', n: ++tags },
							hoisted: HOISTED.has(node.type),
						})
						break
					case 'IfBlock':
					case 'EachBlock':
					case 'AwaitBlock':
					case 'KeyBlock':
					case 'SnippetBlock':
						pieces.push({
							start: node.start,
							end: node.end,
							token: { type: 'self', n: ++tags },
							hoisted: HOISTED.has(node.type),
						})

						for (const body of blockBodies(node)) {
							nested.push(...build(body, context))
						}
						break
					default: {
						if (node.type === 'Component' && node.name === 'T') {
							if (!hasPassedChildren(node)) {
								throw fail(node.start, 'nested <T> is not supported inside <T>')
							}

							// Opaque like a block, so the runs around it never merge across it.
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })
							break
						}

						const n = ++tags
						const first = node.fragment.nodes[0]
						const last = node.fragment.nodes.at(-1)
						const hoisted = HOISTED.has(node.type)

						if (first && last) {
							const body = childContext(node, context)
							pieces.push({
								start: node.start,
								end: first.start,
								token: { type: 'open', n },
								hoisted,
								body,
							})
							visit(node.fragment.nodes, body)
							pieces.push({ start: last.end, end: node.end, token: { type: 'close', n }, hoisted })
						} else {
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n }, hoisted })
						}
					}
				}
			}
		}

		visit(nodes, context)

		return [segment(merge(normalize(pieces, context)), expressions), ...nested]
	}

	collect(code, ast.fragment.nodes, preserveAll, undefined, (node, wrap, remove, nodes, preserve) => {
		components.push({
			start: node.start,
			end: node.end,
			wrap,
			remove,
			segments: nodes ? build(nodes, rootContext(preserve)) : [],
		})
	})

	return { ast, components }
}

type Found = (
	node: AST.Component,
	wrap: TComponent['wrap'],
	remove: Range[],
	nodes: AST.Fragment['nodes'] | undefined,
	preserve: boolean
) => void

const collect = (
	code: string,
	nodes: AST.Fragment['nodes'],
	preserve: boolean,
	parent: AST.Fragment['nodes'][number] | undefined,
	found: Found
) => {
	for (const node of nodes) {
		if (node.type === 'Component' && node.name === 'T') {
			if (hasPassedChildren(node)) {
				continue
			}

			// Named slot content keeps its place as a fragment carrying the
			// attribute. Anywhere else a slot attribute has no fragment form,
			// so that <T> stays as it is.
			const slot = node.attributes.find(attribute => attribute.type === 'Attribute' && attribute.name === 'slot')

			if (slot && !(parent && COMPONENTS.has(parent.type))) {
				continue
			}

			const remove: Range[] = []

			// <svelte:fragment> only means something to a component, so its
			// tags go and its content stays.
			const children = node.fragment.nodes.flatMap(child => {
				if (child.type !== 'SvelteFragment') {
					return [child]
				}

				const first = child.fragment.nodes[0]
				const last = child.fragment.nodes.at(-1)

				if (first && last) {
					remove.push({ start: child.start, end: first.start }, { start: last.end, end: child.end })
					return child.fragment.nodes
				}

				remove.push({ start: child.start, end: child.end })
				return []
			})

			const content = children.filter(child => !isBlank(child))
			const snippets = content.filter(child => child.type === 'SnippetBlock')
			const snippet = snippets.find(child => child.expression.name === 'children')

			// A lone, parameterless children snippet inlines its body. Otherwise
			// every declaration stays as written and children gets rendered, so
			// parameters, defaults and helper snippets keep working.
			const inline =
				snippet !== undefined && snippet.parameters.length === 0 && content.length === 1 && remove.length === 0
			const body = inline ? snippet.body.nodes : children
			const outer = inline ? body : node.fragment.nodes
			const first = outer[0]
			const last = outer.at(-1)

			if (body.length > 0 && first && last) {
				const wrap = {
					open: { start: node.start, end: first.start },
					close: { start: last.end, end: node.end },
					head: slot ? `<svelte:fragment ${code.slice(slot.start, slot.end)}>` : '',
					tail: snippet && !inline ? '{@render children()}' : '',
					foot: slot ? '</svelte:fragment>' : '',
				}
				found(node, wrap, remove, body, preserve)
			} else {
				found(node, undefined, [], undefined, preserve)
			}
			continue
		}

		const inside = preserve || (node.type === 'RegularElement' && PRESERVE.has(node.name))

		for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
			const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]
			if (fragment?.type === 'Fragment') {
				collect(code, fragment.nodes, inside, node, found)
			}
		}
	}
}

// Reproduces what clean_nodes does to the text of one body, so the emitted
// text equals what Svelte would have rendered from the markup: the body's
// edges lose whitespace, a text node's own edges collapse to one space
// unless an expression is next to them, and interior whitespace stays.
const normalize = (pieces: Piece[], context: Context): Piece[] => {
	type Item = { piece: Piece; inner?: Piece[]; close?: Piece }

	const items: Item[] = []

	for (let i = 0; i < pieces.length; i++) {
		const piece = pieces[i]!

		if (piece.token.type === 'open') {
			const n = piece.token.n
			let j = i + 1

			while (!(pieces[j]!.token.type === 'close' && (pieces[j]!.token as { n: number }).n === n)) {
				j++
			}

			items.push({ piece, inner: pieces.slice(i + 1, j), close: pieces[j] })
			i = j
		} else {
			items.push({ piece })
		}
	}

	const dropped = new Set<Item>()
	const text = (item: Item | undefined) => (item?.piece.token.type === 'text' ? item.piece.token : undefined)
	let regular = items.filter(item => !item.piece.hoisted)

	if (!context.preserve) {
		while (regular.length > 0 && text(regular[0]) && isBlankText(text(regular[0])!.value)) {
			dropped.add(regular.shift()!)
		}

		while (regular.length > 0 && text(regular.at(-1)) && isBlankText(text(regular.at(-1))!.value)) {
			dropped.add(regular.pop()!)
		}

		const first = text(regular[0])
		const last = text(regular.at(-1))

		if (first) {
			first.value = first.value.replace(STARTS_WITH_WHITESPACE, '')
		}

		if (last) {
			last.value = last.value.replace(ENDS_WITH_WHITESPACE, '')
		}

		for (const [index, item] of regular.entries()) {
			const token = text(item)

			if (!token) {
				continue
			}

			const previous = regular[index - 1]?.piece.token
			const next = regular[index + 1]?.piece.token

			if (previous?.type !== 'expr') {
				const afterSpace = previous?.type === 'text' && ENDS_WITH_WHITESPACE.test(previous.value)
				token.value = token.value.replace(STARTS_WITH_WHITESPACE, afterSpace ? '' : ' ')
			}

			if (next?.type !== 'expr') {
				token.value = token.value.replace(ENDS_WITH_WHITESPACE, ' ')
			}

			if (token.value === '' || (token.value === ' ' && context.removable)) {
				dropped.add(item)
			}
		}

		regular = regular.filter(item => !dropped.has(item))
	}

	// The browser drops a newline right after <pre>, so Svelte does too.
	const first = text(regular[0])

	if (context.pre && first && (first.value === '\n' || first.value === '\r\n')) {
		dropped.add(regular[0]!)
	}

	return items.flatMap(item => {
		if (dropped.has(item)) {
			return []
		}

		if (item.inner && item.close) {
			return [item.piece, ...normalize(item.inner, item.piece.body!), item.close]
		}

		return [item.piece]
	})
}

// Text nodes split by a comment count as one run.
const merge = (pieces: Piece[]) => {
	const merged: Piece[] = []

	for (const piece of pieces) {
		const previous = merged.at(-1)

		if (piece.token.type === 'text' && previous?.token.type === 'text') {
			previous.token.value += piece.token.value
			previous.end = piece.end
		} else {
			merged.push({ ...piece, token: { ...piece.token } })
		}
	}

	return merged
}

const isRunToken = (token: Token) => token.type === 'text' || token.type === 'expr'

// Runs are the gaps between tag tokens; an empty gap still gets a position
// so a translation that moves text into it has somewhere to go.
const segment = (pieces: Piece[], expressions: Range[]): Segment => {
	const tokens = pieces.map(piece => piece.token)
	const runs: Run[] = []

	if (pieces.length === 0) {
		return { source: '', tokens, expressions, runs }
	}

	let current: Piece[] = []
	let boundary = pieces[0]!.start

	const flush = (next: number) => {
		const first = current[0]
		const last = current.at(-1)

		runs.push(
			first && last
				? { start: first.start, end: last.end, tokens: current.map(piece => piece.token) }
				: { start: boundary, end: boundary, tokens: [] }
		)
		current = []
		boundary = next
	}

	for (const piece of pieces) {
		if (isRunToken(piece.token)) {
			current.push(piece)
		} else {
			flush(piece.end)
		}
	}

	flush(boundary)

	return { source: serialize(tokens), tokens, expressions, runs }
}

export const findTComponents = (code: string, file?: string) => parseT(code, file).components

export const collectSources = (component: TComponent) =>
	component.segments.map(segment => segment.source).filter(source => source !== '')

// ---------------------------------------------------------------------------
// The translator string: `text ${0} <1>text</1> <2/>`, with `\$ \< \> \\` for literals

const escapeText = (text: string) => text.replace(/[\\$<>]/g, char => `\\${char}`)

export const serialize = (tokens: Token[]) =>
	tokens
		.map(token => {
			switch (token.type) {
				case 'text':
					return escapeText(token.value)
				case 'expr':
					return `\${${token.index}}`
				case 'open':
					return `<${token.n}>`
				case 'close':
					return `</${token.n}>`
				case 'self':
					return `<${token.n}/>`
			}
		})
		.join('')

export const tokenize = (text: string) => {
	const tokens: Token[] = []
	let buffer = ''
	let i = 0

	const flush = () => {
		if (buffer !== '') {
			tokens.push({ type: 'text', value: buffer })
			buffer = ''
		}
	}

	while (i < text.length) {
		const char = text[i]!

		if (char === '\\' && i + 1 < text.length) {
			buffer += text[i + 1]
			i += 2
			continue
		}

		const placeholder = char === '$' ? /^\$\{(\d+)\}/.exec(text.slice(i)) : null

		if (placeholder) {
			flush()
			tokens.push({ type: 'expr', index: Number(placeholder[1]) })
			i += placeholder[0].length
			continue
		}

		const tag = char === '<' ? /^<(\/?)(\d+)\s*(\/?)>/.exec(text.slice(i)) : null

		if (tag && !(tag[1] && tag[3])) {
			flush()
			tokens.push({ type: tag[1] ? 'close' : tag[3] ? 'self' : 'open', n: Number(tag[2]) })
			i += tag[0].length
			continue
		}

		buffer += char
		i++
	}

	flush()

	return tokens
}

// Splits at the tag tokens, so run k of the source lines up with run k of a translation.
const splitRuns = (tokens: Token[]) => {
	const runs: Token[][] = [[]]
	const tags: string[] = []

	for (const token of tokens) {
		if (isRunToken(token)) {
			runs.at(-1)!.push(token)
		} else {
			tags.push(`${token.type}${token.n}`)
			runs.push([])
		}
	}

	return { tags, runs }
}

const placeholdersOf = (tokens: Token[]) =>
	tokens
		.flatMap(token => (token.type === 'expr' ? [token.index] : []))
		.toSorted((a, b) => a - b)
		.join(' ')

// lang.t placeholders hold arbitrary code, so only `${...}` without braces inside counts.
const placeholders = (text: string) =>
	Array.from(text.matchAll(/\$\{([^{}]*)\}/g), match => match[1]!)
		.toSorted()
		.join('\u0000')

/** Returns what is wrong with a lang.t translation, or nothing when it
 * keeps every `${...}` placeholder. Angle brackets are plain text there. */
export const validatePlaceholders = (source: string, translation: string) => {
	if (placeholders(source) !== placeholders(translation)) {
		return 'a placeholder is missing, duplicated or changed'
	}

	return
}

/** Returns what is wrong with a <T> translation, or nothing when it keeps
 * the tags of the source in order and every placeholder in its own run. */
export const validateTranslation = (source: string, translation: string) => {
	const expected = splitRuns(tokenize(source))
	const actual = splitRuns(tokenize(translation))

	if (expected.tags.join(' ') !== actual.tags.join(' ')) {
		return 'the numbered tags differ from the source'
	}

	for (const [index, run] of expected.runs.entries()) {
		if (placeholdersOf(run) !== placeholdersOf(actual.runs[index]!)) {
			return 'a placeholder is missing, duplicated or moved across a tag'
		}
	}

	return
}

// ---------------------------------------------------------------------------
// Emitting: `{__i18n_lang.t.pick(["Hello ", 0], {"fr":["Bonjour ", 0]}, [(name)])}`

export type Edit = Range & { text: string }
export type Lookup = (source: string, locale: string) => string | undefined

// Parts are text or the position of a value, so a translation can reorder
// expressions while each one is still evaluated only once.
const partsOf = (tokens: Token[], positions: Map<number, number>) =>
	tokens.map(token => {
		if (token.type === 'text') {
			return token.value
		}

		if (token.type !== 'expr' || !positions.has(token.index)) {
			throw new Error(`Translation references ${serialize([token])} which is not in this run of the source.`)
		}

		return positions.get(token.index)!
	})

// An expression's source with the lang.t rewrites that fall inside it
// spliced in by offset, since the text itself is never searched.
const spliced = (code: string, target: Range, rewrites: Edit[]) => {
	let result = ''
	let cursor = target.start

	for (const rewrite of rewrites) {
		if (rewrite.start >= target.start && rewrite.end <= target.end) {
			result += code.slice(cursor, rewrite.start) + rewrite.text
			cursor = rewrite.end
		}
	}

	return result + code.slice(cursor, target.end)
}

/** The edits turning a <T> into an `{#if true}` block with translated text
 * runs, and whether any of them calls the runtime. An edit without text
 * removes, one without length inserts. */
export const transformT = (
	component: TComponent,
	code: string,
	locales: string[],
	lookup: Lookup,
	warn: (message: string) => void,
	rewrites: Edit[] = []
) => {
	const edits: Edit[] = []
	let translated = false

	if (!component.wrap) {
		return { edits: [{ start: component.start, end: component.end, text: '' }], translated }
	}

	// A block is a real scope for `{@const}` and snippets, and unlike a
	// snippet it is not handed to an enclosing component as a prop.
	edits.push(...component.remove.map(range => ({ ...range, text: '' })))
	edits.push({ ...component.wrap.open, text: `${component.wrap.head}{#if true}` })
	edits.push({ ...component.wrap.close, text: `${component.wrap.tail}{/if}${component.wrap.foot}` })

	for (const segment of component.segments) {
		if (segment.source === '') {
			continue
		}

		const translations: { locale: string; runs: Token[][] }[] = []

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

			translations.push({ locale, runs: splitRuns(tokenize(translation)).runs })
		}

		if (translations.length === 0) {
			continue
		}

		for (const [index, run] of segment.runs.entries()) {
			const indices = run.tokens.flatMap(token => (token.type === 'expr' ? [token.index] : []))
			const positions = new Map(indices.map((expression, position) => [expression, position]))
			const source = JSON.stringify(partsOf(run.tokens, positions))

			const changed = translations.flatMap(item => {
				const parts = JSON.stringify(partsOf(item.runs[index]!, positions))
				return parts === source ? [] : [`"${item.locale}":${parts}`]
			})

			if (changed.length === 0) {
				continue
			}

			// Parentheses keep a sequence expression as one value.
			const values =
				indices.length > 0
					? `, [${indices.map(i => `(${spliced(code, segment.expressions[i]!, rewrites)})`).join(', ')}]`
					: ''

			edits.push({
				start: run.start,
				end: run.end,
				text: `{__i18n_lang.t.pick(${source}, {${changed.join(',')}}${values})}`,
			})
			translated = true
		}
	}

	return { edits, translated }
}
