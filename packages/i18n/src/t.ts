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
type Context = {
	preserve: boolean
	removable: boolean
	pre: boolean
	svg: boolean
	svgText: boolean
	/** A component body: its slotted children are not part of the default slot sequence. */
	component: boolean
}

type Piece = Range & {
	token: Token
	/** Svelte hoists these nodes out of the body, so they don't take part in whitespace. */
	hoisted?: boolean
	/** The body an `open` token starts. */
	body?: Context
	/** Whitespace Svelte would drop; it stays in the source, so an edit must take it along. */
	dropped?: boolean
	/** Carries a slot attribute, so under a component it belongs to another slot. */
	slotted?: boolean
}

export type Edit = Range & { text: string }

// The text between two tag boundaries: translated and emitted as one call.
export type Run = Range & { tokens: Token[]; dropped: Range[] }

// One translatable string: the <T> children or a block branch body.
export type Segment = {
	source: string
	tokens: Token[]
	expressions: Range[]
	runs: Run[]
}

export type TComponent = Range & {
	/** What goes around the block: a `<svelte:fragment>` for named slot content, else nothing. */
	head: string
	foot: string
	/** The pieces of the <T> that make way for the block scope. Absent when empty. */
	wrap?: { open: Range; close: Range; tail: string }
	/** Edits inside the body: unslotted `<svelte:fragment>` tags become their own `{#if true}` blocks. */
	extra: Edit[]
	segments: Segment[]
}

export const T_MODULE = '@awsless/i18n/T'

export const hasT = (code: string) => code.includes(T_MODULE)

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

const hasSlotAttribute = (node: AST.Fragment['nodes'][number]) =>
	'attributes' in node &&
	node.attributes.some(attribute => attribute.type === 'Attribute' && attribute.name === 'slot')

// Only a slot attribute and let: directives survive the unwrapping. Any other
// attribute (css --props, children, a spread, handlers, ...) or named slot
// content among the children means the runtime component has to stay.
const isRuntimeOnly = (node: AST.Component) =>
	node.attributes.some(
		attribute =>
			!(attribute.type === 'LetDirective' || (attribute.type === 'Attribute' && attribute.name === 'slot'))
	) || node.fragment.nodes.some(hasSlotAttribute)

const COMPONENTS = new Set(['Component', 'SvelteComponent', 'SvelteSelf'])

// Their bodies are code, not text: never extracted, translated or rewritten.
const RAW = new Set(['script', 'style'])

type Pattern = {
	type: string
	name?: string
	properties?: Pattern[]
	elements?: (Pattern | null)[]
	left?: Pattern
	argument?: Pattern
	value?: Pattern
}

// Bound names of a pattern, or of the expression Svelte parses a let:
// directive into, which has the same shapes under other type names.
const patternNames = (pattern: Pattern | null | undefined, names: string[] = []) => {
	if (!pattern) {
		return names
	}

	switch (pattern.type) {
		case 'Identifier':
			names.push(pattern.name!)
			break
		case 'ObjectPattern':
		case 'ObjectExpression':
			pattern.properties?.forEach(property =>
				patternNames(
					property.type === 'RestElement' || property.type === 'SpreadElement'
						? property.argument
						: property.value,
					names
				)
			)
			break
		case 'ArrayPattern':
		case 'ArrayExpression':
			pattern.elements?.forEach(element => patternNames(element, names))
			break
		case 'AssignmentPattern':
		case 'AssignmentExpression':
			patternNames(pattern.left, names)
			break
		case 'RestElement':
		case 'SpreadElement':
			patternNames(pattern.argument, names)
			break
	}

	return names
}

const letNames = (node: AST.ElementLike) =>
	node.attributes.flatMap(attribute =>
		attribute.type === 'LetDirective'
			? attribute.expression
				? patternNames(attribute.expression as Pattern)
				: [attribute.name]
			: []
	)

/** The <T> uses that are ours: any default import of this package, used
 * where no each, snippet, let:, @const or await binding shadows that name. */
export const resolveT = (ast: AST.Root) => {
	const ours = new Set<AST.Component>()
	const names = new Set<string>()

	for (const script of [ast.instance, ast.module]) {
		for (const statement of script?.content.body ?? []) {
			if (statement.type === 'ImportDeclaration' && statement.source.value === T_MODULE) {
				for (const specifier of statement.specifiers) {
					if (
						specifier.type === 'ImportDefaultSpecifier' ||
						(specifier.type === 'ImportSpecifier' &&
							specifier.imported.type === 'Identifier' &&
							specifier.imported.name === 'default')
					) {
						names.add(specifier.local.name)
					}
				}
			}
		}
	}

	if (names.size === 0) {
		return { names, ours }
	}

	// `lets` are a component's let: bindings: they reach its default slot
	// children only, a child with a slot attribute sees the scope without them.
	const walk = (nodes: AST.Fragment['nodes'], scope: Set<string>, lets: string[] = [], component = false) => {
		const inner = new Set(scope)
		const declared: string[] = []

		// Declarations and snippets bind in the enclosing fragment. Under a
		// component, declarations reach its default slot only, like let: does.
		for (const node of nodes) {
			if (node.type === 'ConstTag' || node.type === 'DeclarationTag') {
				node.declaration.declarations.forEach(declaration =>
					declared.push(...patternNames(declaration.id as Pattern))
				)
			}

			if (node.type === 'SnippetBlock') {
				inner.add(node.expression.name)
			}
		}

		const full = new Set([...inner, ...declared, ...lets])

		for (const node of nodes) {
			const current = component && hasSlotAttribute(node) ? inner : full
			const extend = (names: string[]) => new Set([...current, ...names])

			switch (node.type) {
				case 'EachBlock':
					walk(
						node.body.nodes,
						extend([...patternNames(node.context as Pattern), ...(node.index ? [node.index] : [])])
					)
					if (node.fallback) {
						walk(node.fallback.nodes, current)
					}
					break
				case 'SnippetBlock':
					walk(
						node.body.nodes,
						extend(node.parameters.flatMap(parameter => patternNames(parameter as Pattern)))
					)
					break
				case 'AwaitBlock':
					if (node.pending) {
						walk(node.pending.nodes, current)
					}
					if (node.then) {
						walk(node.then.nodes, extend(patternNames(node.value as Pattern)))
					}
					if (node.catch) {
						walk(node.catch.nodes, extend(patternNames(node.error as Pattern)))
					}
					break
				case 'IfBlock':
					walk(node.consequent.nodes, current)
					if (node.alternate) {
						walk(node.alternate.nodes, current)
					}
					break
				case 'KeyBlock':
					walk(node.fragment.nodes, current)
					break
				default:
					if ('fragment' in node && node.fragment?.type === 'Fragment') {
						if (node.type === 'Component' && names.has(node.name) && !current.has(node.name)) {
							ours.add(node)
						}

						walk(node.fragment.nodes, current, letNames(node), COMPONENTS.has(node.type))
					}
			}
		}
	}

	walk(ast.fragment.nodes, new Set())

	return { names, ours }
}

const isBlank = (node: AST.Fragment['nodes'][number]) =>
	node.type === 'Comment' || (node.type === 'Text' && isBlankText(node.data))

const rootContext = (preserve: boolean): Context => ({
	preserve,
	removable: false,
	pre: false,
	svg: false,
	svgText: false,
	component: false,
})

// A block body is its own fragment to Svelte: whitespace preservation and the
// namespace carry on, the rules tied to the immediate parent element do not.
const blockContext = (parent: Context): Context => ({
	...parent,
	removable: parent.svg && !parent.svgText,
	pre: false,
	component: false,
})

const childContext = (node: AST.ElementLike, parent: Context): Context => {
	const regular = node.type === 'RegularElement'
	// Svelte infers namespaces: <svg> starts one, <foreignObject> is HTML again.
	const svg = regular && node.name === 'foreignObject' ? false : parent.svg || (regular && node.name === 'svg')
	const svgText = svg && (parent.svgText || (regular && node.name === 'text'))

	return {
		preserve: parent.preserve || (regular && PRESERVE.has(node.name)),
		removable: (regular && REMOVABLE.has(node.name)) || (svg && !svgText),
		pre: regular && node.name === 'pre',
		svg,
		svgText,
		component: COMPONENTS.has(node.type),
	}
}

export const parseT = (code: string, file?: string) => {
	const ast = parse(code, { modern: true })
	const components: TComponent[] = []
	const preserveAll = ast.options?.preserveWhitespace === true
	const { ours } = resolveT(ast)

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

	// `direct` marks the <T> body itself, where an unslotted <svelte:fragment>
	// would be meaningless once the component is gone.
	const build = (nodes: AST.Fragment['nodes'], context: Context, extra: Edit[], direct = false): Segment[] => {
		const pieces: Piece[] = []
		const expressions: Range[] = []
		const nested: Segment[] = []
		let tags = 0

		const visit = (nodes: AST.Fragment['nodes'], context: Context, direct: boolean) => {
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
							nested.push(...build(body, blockContext(context), extra))
						}
						break
					default: {
						if (node.type === 'Component' && ours.has(node)) {
							if (!isRuntimeOnly(node)) {
								throw fail(node.start, 'nested <T> is not supported inside <T>')
							}

							// Opaque like a block, so the runs around it never merge across it.
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })
							break
						}

						if (node.type === 'SvelteFragment' && direct) {
							// Without the component it belonged to, the fragment becomes its
							// own block: it keeps its scope and is a segment of its own.
							const first = node.fragment.nodes[0]
							const last = node.fragment.nodes.at(-1)

							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })

							if (first && last) {
								extra.push({ start: node.start, end: first.start, text: '{#if true}' })
								extra.push({ start: last.end, end: node.end, text: '{/if}' })
								nested.push(...build(node.fragment.nodes, context, extra))
							} else {
								extra.push({ start: node.start, end: node.end, text: '{#if true}{/if}' })
							}
							break
						}

						const n = ++tags
						const first = node.fragment.nodes[0]
						const last = node.fragment.nodes.at(-1)
						const hoisted = HOISTED.has(node.type)
						const slotted = hasSlotAttribute(node)

						if (node.type === 'RegularElement' && RAW.has(node.name)) {
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n } })
							break
						}

						if (first && last) {
							const body = childContext(node, context)
							pieces.push({
								start: node.start,
								end: first.start,
								token: { type: 'open', n },
								hoisted,
								slotted,
								body,
							})
							visit(node.fragment.nodes, body, false)
							pieces.push({ start: last.end, end: node.end, token: { type: 'close', n }, hoisted })
						} else {
							pieces.push({
								start: node.start,
								end: node.end,
								token: { type: 'self', n },
								hoisted,
								slotted,
							})
						}
					}
				}
			}
		}

		visit(nodes, context, direct)

		return [segment(merge(normalize(pieces, context)), expressions), ...nested]
	}

	collect(code, ours, ast.fragment.nodes, preserveAll, undefined, (node, head, foot, wrap, nodes, preserve) => {
		const extra: Edit[] = []

		components.push({
			start: node.start,
			end: node.end,
			head,
			foot,
			wrap,
			extra,
			segments: nodes ? build(nodes, rootContext(preserve), extra, true) : [],
		})
	})

	return { ast, components }
}

type Found = (
	node: AST.Component,
	head: string,
	foot: string,
	wrap: TComponent['wrap'],
	nodes: AST.Fragment['nodes'] | undefined,
	preserve: boolean
) => void

const collect = (
	code: string,
	ours: Set<AST.Component>,
	nodes: AST.Fragment['nodes'],
	preserve: boolean,
	parent: AST.Fragment['nodes'][number] | undefined,
	found: Found
) => {
	for (const node of nodes) {
		if (node.type === 'Component' && ours.has(node)) {
			if (isRuntimeOnly(node)) {
				continue
			}

			// Named slot content keeps its place as a fragment carrying the
			// attribute. Anywhere else a slot attribute has no fragment form,
			// so that <T> stays as it is.
			const slot = node.attributes.find(attribute => attribute.type === 'Attribute' && attribute.name === 'slot')

			if (slot && !(parent && COMPONENTS.has(parent.type))) {
				continue
			}

			// The fragment takes the slot and its let: bindings as written.
			const carried = node.attributes.filter(attribute => attribute === slot || attribute.type === 'LetDirective')
			const head = slot
				? `<svelte:fragment ${carried.map(item => code.slice(item.start, item.end)).join(' ')}>`
				: ''
			const foot = slot ? '</svelte:fragment>' : ''

			const children = node.fragment.nodes
			const content = children.filter(child => !isBlank(child))

			// An explicit children snippet stays as declared and gets rendered, so
			// its parameters, self references and helper snippets keep working.
			const snippet = content.find(child => child.type === 'SnippetBlock' && child.expression.name === 'children')
			const first = node.fragment.nodes[0]
			const last = node.fragment.nodes.at(-1)

			if (children.length > 0 && first && last) {
				const wrap = {
					open: { start: node.start, end: first.start },
					close: { start: last.end, end: node.end },
					tail: snippet ? '{@render children()}' : '',
				}
				found(node, head, foot, wrap, children, preserve)
			} else {
				found(node, head, foot, undefined, undefined, preserve)
			}
			continue
		}

		const inside = preserve || (node.type === 'RegularElement' && PRESERVE.has(node.name))

		for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
			const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]
			if (fragment?.type === 'Fragment') {
				collect(code, ours, fragment.nodes, inside, node, found)
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
	// Like Svelte, a component's slotted children are cleaned as their own
	// slots; the default slot sequence runs right past them.
	let regular = items.filter(item => !item.piece.hoisted && !(context.component && item.piece.slotted))

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
			return [{ ...item.piece, token: { type: 'text' as const, value: '' }, dropped: true }]
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

		if (piece.dropped) {
			merged.push({ ...piece })
		} else if (piece.token.type === 'text' && previous?.token.type === 'text' && !previous.dropped) {
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
	const tokens = pieces.filter(piece => !piece.dropped).map(piece => piece.token)
	const runs: Run[] = []

	if (pieces.length === 0) {
		return { source: '', tokens, expressions, runs }
	}

	let current: Piece[] = []
	let boundary = pieces[0]!.start

	const flush = (next: number) => {
		const first = current[0]
		const last = current.at(-1)

		const kept = current.filter(piece => !piece.dropped)
		const dropped = current.filter(piece => piece.dropped).map(({ start, end }) => ({ start, end }))

		runs.push(
			first && last
				? { start: first.start, end: last.end, tokens: kept.map(piece => piece.token), dropped }
				: { start: boundary, end: boundary, tokens: [], dropped }
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
// Emitting: `{__i18n_lang.t.pick(["Hello ", 0], {"fr":["Bonjour ", 0]}, [__i18n_lang.t.str((name))])}`

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

	// An empty <T> still leaves an empty block behind, so the parent keeps
	// getting children content: a children prop stays defined and legacy
	// slot fallbacks stay suppressed.
	if (!component.wrap) {
		const text = `${component.head}{#if true}{/if}${component.foot}`
		return { edits: [{ start: component.start, end: component.end, text }], translated }
	}

	// A block is a real scope for `{@const}` and snippets, and unlike a
	// snippet it is not handed to an enclosing component as a prop.
	edits.push(...component.extra)
	edits.push({ ...component.wrap.open, text: `${component.head}{#if true}` })
	edits.push({ ...component.wrap.close, text: `${component.wrap.tail}{/if}${component.foot}` })

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

		const calls = segment.runs.map((run, index) => {
			const indices = run.tokens.flatMap(token => (token.type === 'expr' ? [token.index] : []))
			const positions = new Map(indices.map((expression, position) => [expression, position]))
			const source = JSON.stringify(partsOf(run.tokens, positions))

			const changed = translations.flatMap(item => {
				const parts = JSON.stringify(partsOf(item.runs[index]!, positions))
				return parts === source ? [] : [`"${item.locale}":${parts}`]
			})

			// Each value is stringified right where Svelte would have, in source
			// order; parentheses keep a sequence expression as one value.
			const values =
				indices.length > 0
					? `, [${indices
							.map(i => `__i18n_lang.t.str((${spliced(code, segment.expressions[i]!, rewrites)}))`)
							.join(', ')}]`
					: ''

			return { run, changed, text: `{__i18n_lang.t.pick(${source}, {${changed.join(',')}}${values})}` }
		})

		if (!calls.some(call => call.changed.length > 0)) {
			continue
		}

		// Once one run is a call, Svelte's boundary trimming no longer reaches
		// its neighbours, so every run of the body is emitted normalised, and
		// whitespace Svelte would have dropped goes with it.
		for (const { run, text } of calls) {
			if (run.tokens.length === 0) {
				edits.push(...run.dropped.map(range => ({ ...range, text: '' })))
				continue
			}

			edits.push({ start: run.start, end: run.end, text })
			translated = true
		}
	}

	return { edits, translated }
}
