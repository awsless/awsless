import lineColumn from 'line-column'
import { AST, parse } from 'svelte/compiler'

// Svelte puts offsets on every node, the estree types just don't declare them.
type Range = { start: number; end: number }
const range = (node: unknown) => node as Range

// Tokens are the one shape shared by the <T> children, the string the
// translator sees and the translation that comes back.
export type Token =
	| { type: 'text'; value: string; preserve: boolean }
	| { type: 'expr'; index: number }
	| { type: 'open' | 'close' | 'self'; n: number }

type Piece = Range & { token: Token }

// The text between two tag boundaries: translated and emitted as one call.
export type Run = Range & { tokens: Token[] }

// One translatable string: the <T> children or a block branch body.
export type Segment = {
	source: string
	tokens: Token[]
	expressions: string[]
	runs: Run[]
}

export type TComponent = Range & {
	/** The pieces of the <T> that make way for the block scope. Absent when empty. */
	wrap?: { open: Range; close: Range }
	segments: Segment[]
}

export const hasT = (code: string) => /<T[\s/>]/.test(code)

const PRESERVE = new Set(['pre', 'textarea'])
const ASCII_SPACE = /[ \t\n\r\f]+/g

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

	const build = (nodes: AST.Fragment['nodes'], preserve: boolean): Segment[] => {
		const pieces: Piece[] = []
		const expressions: string[] = []
		const nested: Segment[] = []
		let tags = 0

		const visit = (nodes: AST.Fragment['nodes'], preserve: boolean) => {
			for (const node of nodes) {
				switch (node.type) {
					case 'Text':
						pieces.push({
							start: node.start,
							end: node.end,
							token: { type: 'text', value: node.data, preserve },
						})
						break
					case 'Comment':
						break
					case 'ExpressionTag':
						pieces.push({
							start: node.start,
							end: node.end,
							token: { type: 'expr', index: expressions.length },
						})
						expressions.push(code.slice(range(node.expression).start, range(node.expression).end))
						break
					case 'HtmlTag':
					case 'RenderTag':
					case 'ConstTag':
					case 'DebugTag':
					case 'AttachTag':
					case 'DeclarationTag':
						pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })
						break
					case 'IfBlock':
					case 'EachBlock':
					case 'AwaitBlock':
					case 'KeyBlock':
					case 'SnippetBlock':
						pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })

						for (const body of blockBodies(node)) {
							nested.push(...build(body, preserve))
						}
						break
					default: {
						if (node.type === 'Component' && node.name === 'T') {
							throw fail(node.start, 'nested <T> is not supported inside <T>')
						}

						const n = ++tags
						const first = node.fragment.nodes[0]
						const last = node.fragment.nodes.at(-1)

						if (first && last) {
							pieces.push({ start: node.start, end: first.start, token: { type: 'open', n } })
							visit(node.fragment.nodes, preserve || PRESERVE.has(node.name))
							pieces.push({ start: last.end, end: node.end, token: { type: 'close', n } })
						} else {
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n } })
						}
					}
				}
			}
		}

		visit(nodes, preserve)

		return [segment(normalize(pieces), expressions), ...nested]
	}

	collect(ast.fragment.nodes, preserveAll, (node, wrap, nodes, preserve) => {
		components.push({
			start: node.start,
			end: node.end,
			wrap,
			segments: nodes ? build(nodes, preserve) : [],
		})
	})

	return { ast, components }
}

type Found = (
	node: AST.Component,
	wrap: TComponent['wrap'],
	nodes: AST.Fragment['nodes'] | undefined,
	preserve: boolean
) => void

const collect = (nodes: AST.Fragment['nodes'], preserve: boolean, found: Found) => {
	for (const node of nodes) {
		if (node.type === 'Component' && node.name === 'T') {
			const children = node.fragment.nodes
			const content = children.filter(child => !isBlank(child))
			const only = content.length === 1 ? content[0] : undefined

			// An explicit children snippet is the content, so its body stays
			// and the snippet declaration goes with the tags.
			const body =
				only?.type === 'SnippetBlock' && only.expression.name === 'children' ? only.body.nodes : children
			const first = body[0]
			const last = body.at(-1)

			if (first && last) {
				const wrap = {
					open: { start: node.start, end: first.start },
					close: { start: last.end, end: node.end },
				}
				found(node, wrap, body, preserve)
			} else {
				found(node, undefined, undefined, preserve)
			}
			continue
		}

		const inside = preserve || ('name' in node && typeof node.name === 'string' && PRESERVE.has(node.name))

		for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
			const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]
			if (fragment?.type === 'Fragment') {
				collect(fragment.nodes, inside, found)
			}
		}
	}
}

// Whitespace is a token level pass: only ASCII spaces collapse and trim, and
// none of it inside pre, textarea or a preserveWhitespace component.
const normalize = (pieces: Piece[]) => {
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

	const first = merged[0]?.token
	const last = merged.at(-1)?.token

	for (const { token } of merged) {
		if (token.type === 'text' && !token.preserve) {
			token.value = token.value.replace(ASCII_SPACE, ' ')
		}
	}

	if (first?.type === 'text' && !first.preserve) {
		first.value = first.value.replace(/^[ \t\n\r\f]+/, '')
	}

	if (last?.type === 'text' && !last.preserve) {
		last.value = last.value.replace(/[ \t\n\r\f]+$/, '')
	}

	return merged.filter(piece => piece.token.type !== 'text' || piece.token.value !== '')
}

const isRunToken = (token: Token) => token.type === 'text' || token.type === 'expr'

// Runs are the gaps between tag tokens; an empty gap still gets a position
// so a translation that moves text into it has somewhere to go.
const segment = (pieces: Piece[], expressions: string[]): Segment => {
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
			tokens.push({ type: 'text', value: buffer, preserve: false })
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

/** Returns what is wrong with the translation, or nothing when it keeps
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
// Emitting: `{__i18n_lang.t.pick(["Hello ", 0], {"fr":["Bonjour ", 0]}, [name])}`

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

/** The edits turning a <T> into an `{#if true}` block with translated text
 * runs, and whether any of them calls the runtime. An edit without text
 * removes, one without length inserts. */
export const transformT = (
	component: TComponent,
	locales: string[],
	lookup: Lookup,
	warn: (message: string) => void
) => {
	const edits: Edit[] = []
	let translated = false

	if (!component.wrap) {
		return { edits: [{ start: component.start, end: component.end, text: '' }], translated }
	}

	// A block is a real scope for `{@const}` and snippets, and unlike a
	// snippet it is not handed to an enclosing component as a prop.
	edits.push({ ...component.wrap.open, text: '{#if true}' })
	edits.push({ ...component.wrap.close, text: '{/if}' })

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

			const values = indices.length > 0 ? `, [${indices.map(i => segment.expressions[i]).join(', ')}]` : ''

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
