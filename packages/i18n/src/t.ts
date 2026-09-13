import lineColumn from 'line-column'
import { AST, parse } from 'svelte/compiler'
import { annotate, lookupNamespace, Namespace, svelteInternals, SvelteNode } from './svelte-internal'

// Svelte puts offsets on every node, the estree types just don't declare them.
type Range = { start: number; end: number }
const range = (node: unknown) => node as Range

// Tokens are the one shape shared by the <T> children, the string the
// translator sees and the translation that comes back.
export type Token =
	| { type: 'text'; value: string }
	| { type: 'expr'; index: number }
	| { type: 'open' | 'close' | 'self'; n: number }

/** The compiler options the cleaning depends on, as the Svelte plugin has them. */
export type TOptions = {
	preserveWhitespace?: boolean
	preserveComments?: boolean
	namespace?: Namespace
}

// Where a body sits: what Svelte's visitors carry down to clean it, plus
// what sealing needs to know about the element around it.
type Context = {
	/** The ancestors of the body's owner, the way Svelte's visitors carry them. */
	path: SvelteNode[]
	namespace: Namespace
	preserve: boolean
	/** The enclosing element only allows specific children, so no text may be added. */
	restricted: boolean
	/** Inside an svg text element, where text is allowed again. */
	svgText: boolean
}

type Piece = Range & {
	token: Token
	/** What sealing needs to know about the body an `open` token starts. */
	body?: { restricted: boolean; component: boolean }
	/** Whitespace Svelte drops; it stays in the source, so an edit must take it along. */
	dropped?: boolean
	/** Carries a slot attribute, so under a component it belongs to another slot. */
	slotted?: boolean
	/** A snippet declaration: under a component it is a prop, not content. */
	snippet?: boolean
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
	/** Runs directly inside a component that has no default slot content; text
	 * put there would create one and change what the component renders. */
	sealed: number[]
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

// Elements that only allow specific children, so a translation may not put
// text between them. The svg ones are decided by namespace below.
const RESTRICTED = new Set(['select', 'tr', 'table', 'tbody', 'thead', 'tfoot', 'colgroup', 'datalist', 'optgroup'])
// The svg elements whose content is text; every other svg element holds shapes.
const SVG_TEXT = new Set(['text', 'tspan', 'textPath', 'title', 'desc'])

const hasSlotAttribute = (node: AST.Fragment['nodes'][number]) =>
	'attributes' in node &&
	node.attributes.some(attribute => attribute.type === 'Attribute' && attribute.name === 'slot')

// Only a slot attribute and let: directives survive the unwrapping. Any other
// attribute (css --props, children, a spread, handlers, ...) or named slot
// content among the children means the runtime component has to stay.
const hasStaticXmlns = (node: AST.SvelteElement) =>
	node.attributes.some(
		attribute =>
			attribute.type === 'Attribute' &&
			attribute.name === 'xmlns' &&
			Array.isArray(attribute.value) &&
			attribute.value.length === 1 &&
			attribute.value[0]?.type === 'Text'
	)

// The <svelte:element>s whose namespace is looked up through the <T>: the
// walk stops where Svelte's own lookup stops, at an element with a namespace
// of its own, a component or a snippet, and passes through what does not
// shield it: blocks, a direct fragment and a boundary.
const hasExposedDynamicElement = (nodes: AST.Fragment['nodes']): boolean =>
	nodes.some(node => {
		switch (node.type) {
			case 'SvelteElement':
				return !hasStaticXmlns(node)
			case 'SvelteFragment':
			case 'SvelteBoundary':
			case 'KeyBlock':
				return hasExposedDynamicElement(node.fragment.nodes)
			case 'IfBlock':
				return (
					hasExposedDynamicElement(node.consequent.nodes) ||
					(node.alternate !== null && hasExposedDynamicElement(node.alternate.nodes))
				)
			case 'EachBlock':
				return (
					hasExposedDynamicElement(node.body.nodes) ||
					(node.fallback !== undefined && hasExposedDynamicElement(node.fallback.nodes))
				)
			case 'AwaitBlock':
				return [node.pending, node.then, node.catch].some(
					body => body !== null && hasExposedDynamicElement(body.nodes)
				)
			default:
				return false
		}
	})

// A component resets the namespace its children see, the block wrapper does
// not: a <svelte:element> without a static xmlns gets the component's own
// namespace now and the surrounding one once unwrapped. When those differ,
// the runtime component has to stay. `path` is the <T>'s ancestry.
const isRuntimeOnly = (node: AST.Component, path: SvelteNode[], componentNamespace: Namespace) =>
	node.attributes.some(
		attribute =>
			!(attribute.type === 'LetDirective' || (attribute.type === 'Attribute' && attribute.name === 'slot'))
	) ||
	node.fragment.nodes.some(hasSlotAttribute) ||
	(hasExposedDynamicElement(node.fragment.nodes) && lookupNamespace(path, componentNamespace) !== componentNamespace)

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
	node.type === 'Comment' || (node.type === 'Text' && node.data.trim() === '')

const slotName = (node: AST.Fragment['nodes'][number]) => {
	if (!('attributes' in node)) {
		return 'default'
	}

	const slot = node.attributes.find(attribute => attribute.type === 'Attribute' && attribute.name === 'slot')
	const value = slot?.type === 'Attribute' && Array.isArray(slot.value) ? slot.value[0] : undefined

	return value?.type === 'Text' ? value.data : 'default'
}

export const parseT = (code: string, file?: string, options: TOptions = {}) => {
	const internals = svelteInternals()
	const ast = parse(code, { modern: true })
	const components: TComponent[] = []
	// The component's own options beat the compiler defaults.
	const preserveAll = ast.options?.preserveWhitespace ?? options.preserveWhitespace ?? false
	const preserveComments = options.preserveComments ?? false
	const namespace = (ast.options?.namespace as Namespace | undefined) ?? options.namespace ?? 'html'
	const { ours } = resolveT(ast)

	annotate(ast, namespace, internals)

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

	// The call Svelte's Fragment visitor makes for a body: the namespace is
	// re-inferred from the children and the text nodes come back trimmed and
	// collapsed, in place, exactly as they will render.
	const clean = (owner: SvelteNode, nodes: Nodes, context: Context) => {
		const namespace = internals.inferNamespace(context.namespace, owner, nodes as unknown as SvelteNode[])
		const { trimmed } = internals.cleanNodes(
			owner,
			nodes as unknown as SvelteNode[],
			[...context.path, owner],
			namespace,
			context.preserve,
			preserveComments
		)

		return { kept: new Set(trimmed as unknown as Nodes), namespace }
	}

	// A component's children are cleaned per slot, and its snippets are props
	// that take no part, which is how Svelte's component visitor groups them.
	const bodies = (owner: SvelteNode, nodes: Nodes, context: Context) => {
		const kept = new Set<Nodes[number]>()
		const namespaces = new Map<Nodes[number], Namespace>()

		const groups = new Map<string, Nodes>()

		if (COMPONENTS.has(owner.type)) {
			for (const node of nodes) {
				if (node.type !== 'SnippetBlock') {
					groups.set(slotName(node), [...(groups.get(slotName(node)) ?? []), node])
				}
			}
		} else {
			groups.set('default', nodes)
		}

		for (const group of groups.values()) {
			const cleaned = clean(owner, group, context)

			for (const node of cleaned.kept) {
				kept.add(node)
				namespaces.set(node, cleaned.namespace)
			}
		}

		return { kept, namespaces }
	}

	// `direct` marks the <T> body itself, where an unslotted <svelte:fragment>
	// would be meaningless once the component is gone.
	const build = (owner: SvelteNode, nodes: Nodes, context: Context, extra: Edit[], direct = false): Segment[] => {
		const pieces: Piece[] = []
		const expressions: Range[] = []
		const nested: Segment[] = []
		let tags = 0

		// One body: its children cleaned the way Svelte cleans them, then walked
		// in source order, with element children staying in this segment.
		const visit = (owner: SvelteNode, nodes: Nodes, context: Context, direct: boolean) => {
			const { kept, namespaces } = bodies(owner, nodes, context)
			const inner = [...context.path, owner]
			const first = nodes[0]

			// A textarea's leading newlines stay in the markup, so the browser and
			// Svelte's server value handling drop and restore them as they do for
			// the untranslated markup; the run starts after them.
			let lead = 0

			if (
				owner.type === 'RegularElement' &&
				owner.name === 'textarea' &&
				first?.type === 'Text' &&
				kept.has(first)
			) {
				lead = /^(\r?\n)+/.exec(code.slice(first.start, first.end))?.[0].length ?? 0
				first.data = first.data.replace(/^(\r?\n)+/, '')
			}

			const below = (node: Nodes[number], overrides: Partial<Context>): Context => ({
				...context,
				path: inner,
				namespace: namespaces.get(node) ?? context.namespace,
				...overrides,
			})

			for (const node of nodes) {
				switch (node.type) {
					case 'Text': {
						const start = node === first ? node.start + lead : node.start

						if (kept.has(node) && node.data !== '') {
							pieces.push({ start, end: node.end, token: { type: 'text', value: node.data } })
						} else {
							pieces.push({ start, end: node.end, token: { type: 'text', value: '' }, dropped: true })
						}
						break
					}
					case 'Comment':
						// A kept comment is a boundary, as Svelte treats it.
						if (kept.has(node)) {
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })
						}
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
						pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })
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
							snippet: node.type === 'SnippetBlock',
						})

						for (const body of blockBodies(node)) {
							nested.push(...build(node as SvelteNode, body, below(node, {}), extra))
						}
						break
					default: {
						if (node.type === 'Component' && ours.has(node)) {
							if (!isRuntimeOnly(node, inner, namespace)) {
								throw fail(node.start, 'nested <T> is not supported inside <T>')
							}

							// Opaque like a block, so the runs around it never merge across it.
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })
							break
						}

						if (node.type === 'SvelteFragment' && direct) {
							// Without the component it belonged to, the fragment becomes its
							// own block: it keeps its scope and is a segment of its own.
							const head = node.fragment.nodes[0]
							const last = node.fragment.nodes.at(-1)

							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n: ++tags } })

							if (head && last) {
								extra.push({ start: node.start, end: head.start, text: '{#if true}' })
								extra.push({ start: last.end, end: node.end, text: '{/if}' })
								nested.push(...build(node as SvelteNode, node.fragment.nodes, below(node, {}), extra))
							} else {
								extra.push({ start: node.start, end: node.end, text: '{#if true}{/if}' })
							}
							break
						}

						const n = ++tags
						const head = node.fragment.nodes[0]
						const last = node.fragment.nodes.at(-1)
						const slotted = hasSlotAttribute(node)

						if (node.type === 'RegularElement' && RAW.has(node.name)) {
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n } })
							break
						}

						if (!head || !last) {
							pieces.push({ start: node.start, end: node.end, token: { type: 'self', n }, slotted })
							break
						}

						const regular = node.type === 'RegularElement'
						const current = namespaces.get(node) ?? context.namespace
						const childNamespace =
							regular || node.type === 'SvelteElement'
								? internals.childNamespace(node as SvelteNode, current)
								: current
						const svgText =
							childNamespace === 'svg' && (context.svgText || (regular && SVG_TEXT.has(node.name)))
						const body = {
							restricted:
								(regular && RESTRICTED.has(node.name)) || (childNamespace === 'svg' && !svgText),
							component: COMPONENTS.has(node.type),
						}

						pieces.push({ start: node.start, end: head.start, token: { type: 'open', n }, slotted, body })
						visit(
							node as SvelteNode,
							node.fragment.nodes,
							below(node, {
								namespace: childNamespace,
								// Svelte's element visitor keeps whitespace inside these two.
								preserve:
									context.preserve || (regular && (node.name === 'pre' || node.name === 'textarea')),
								restricted: body.restricted,
								svgText,
							}),
							false
						)
						pieces.push({ start: last.end, end: node.end, token: { type: 'close', n }, slotted })
					}
				}
			}
		}

		visit(owner, nodes, context, direct)

		return [segment(merge(pieces), expressions, context.restricted), ...nested]
	}

	const root: Context = {
		path: [ast as unknown as SvelteNode],
		namespace,
		preserve: preserveAll,
		restricted: false,
		svgText: false,
	}

	collect(
		code,
		ours,
		internals,
		namespace,
		ast.fragment.nodes,
		root,
		undefined,
		(node, head, foot, wrap, nodes, context) => {
			const extra: Edit[] = []

			components.push({
				start: node.start,
				end: node.end,
				head,
				foot,
				wrap,
				extra,
				segments: nodes ? build(node as SvelteNode, nodes, context, extra, true) : [],
			})
		}
	)

	return { ast, components }
}

type Nodes = AST.Fragment['nodes']

type Found = (
	node: AST.Component,
	head: string,
	foot: string,
	wrap: TComponent['wrap'],
	nodes: AST.Fragment['nodes'] | undefined,
	context: Context
) => void

const collect = (
	code: string,
	ours: Set<AST.Component>,
	internals: ReturnType<typeof svelteInternals>,
	componentNamespace: Namespace,
	nodes: AST.Fragment['nodes'],
	context: Context,
	parent: AST.Fragment['nodes'][number] | undefined,
	found: Found
) => {
	for (const node of nodes) {
		if (node.type === 'Component' && ours.has(node)) {
			if (isRuntimeOnly(node, context.path, componentNamespace)) {
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
				found(node, head, foot, wrap, children, context)
			} else {
				found(node, head, foot, undefined, undefined, context)
			}
			continue
		}

		// The same descent Svelte's visitors make on the way to the <T>: the
		// element namespace and its whitespace rule, and ours for sealing.
		const regular = node.type === 'RegularElement'
		const namespace =
			regular || node.type === 'SvelteElement'
				? internals.childNamespace(node as SvelteNode, context.namespace)
				: context.namespace
		const svgText = namespace === 'svg' && (context.svgText || (regular && SVG_TEXT.has(node.name)))
		const inside: Context = {
			path: [...context.path, node as SvelteNode],
			namespace,
			preserve: context.preserve || (regular && (node.name === 'pre' || node.name === 'textarea')),
			restricted: (regular && RESTRICTED.has(node.name)) || (namespace === 'svg' && !svgText),
			svgText,
		}

		for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
			const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]
			if (fragment?.type === 'Fragment') {
				const inferred = internals.inferNamespace(
					inside.namespace,
					node as SvelteNode,
					fragment.nodes as unknown as SvelteNode[]
				)
				collect(
					code,
					ours,
					internals,
					componentNamespace,
					fragment.nodes,
					{ ...inside, namespace: inferred },
					node,
					found
				)
			}
		}
	}
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
const segment = (pieces: Piece[], expressions: Range[], restricted: boolean): Segment => {
	const tokens = pieces.filter(piece => !piece.dropped).map(piece => piece.token)
	const runs: Run[] = []
	const sealed: number[] = []

	if (pieces.length === 0) {
		return { source: '', tokens, expressions, runs, sealed }
	}

	// Runs are sealed where text may not be added: inside an element that only
	// allows specific children, and inside a component whose direct children
	// are only snippets or slotted children, so it has no default slot.
	const stack: { n: number; sealed: boolean }[] = [{ n: 0, sealed: restricted }]
	const direct = (index: number) => {
		const open = pieces[index]!
		let depth = 0

		for (const piece of pieces.slice(index + 1)) {
			if (piece.token.type === 'open') {
				if (depth === 0 && !piece.slotted) {
					return false
				}
				depth++
			} else if (piece.token.type === 'close') {
				if (depth === 0) {
					return true
				}
				depth--
			} else if (
				depth === 0 &&
				!piece.dropped &&
				!(piece.token.type === 'self' && (piece.snippet || piece.slotted))
			) {
				return false
			}
		}

		return open.body?.component === true
	}

	let current: Piece[] = []
	let boundary = pieces[0]!.start

	const flush = (next: number) => {
		const first = current[0]
		const last = current.at(-1)

		const kept = current.filter(piece => !piece.dropped)
		const dropped = current.filter(piece => piece.dropped).map(({ start, end }) => ({ start, end }))

		if (stack.at(-1)?.sealed) {
			sealed.push(runs.length)
		}

		runs.push(
			first && last
				? { start: first.start, end: last.end, tokens: kept.map(piece => piece.token), dropped }
				: { start: boundary, end: boundary, tokens: [], dropped }
		)
		current = []
		boundary = next
	}

	for (const [index, piece] of pieces.entries()) {
		if (isRunToken(piece.token)) {
			current.push(piece)
		} else {
			flush(piece.end)

			if (piece.token.type === 'open') {
				const body = piece.body
				stack.push({
					n: piece.token.n,
					sealed: body?.restricted === true || (body?.component === true && direct(index)),
				})
			} else if (piece.token.type === 'close') {
				stack.pop()
			}
		}
	}

	flush(boundary)

	return { source: serialize(tokens), tokens, expressions, runs, sealed }
}

export const findTComponents = (code: string, file?: string, options: TOptions = {}) =>
	parseT(code, file, options).components

export const collectSources = (component: TComponent) =>
	component.segments
		.filter(segment => segment.source !== '')
		.map(segment => ({ source: segment.source, sealed: segment.sealed }))

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
 * the tags of the source in order, every placeholder in its own run, and
 * the sealed runs empty. */
export const validateTranslation = (source: string, translation: string, sealed: number[] = []) => {
	const expected = splitRuns(tokenize(source))
	const actual = splitRuns(tokenize(translation))

	if (expected.tags.join(' ') !== actual.tags.join(' ')) {
		return 'the numbered tags differ from the source'
	}

	if (sealed.some(index => serialize(actual.runs[index] ?? []) !== serialize(expected.runs[index]!))) {
		return 'text was changed where the surrounding element or component allows none'
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

/** A name for the imported `lang` that nothing in the file uses: every
 * identifier in the scripts and the template counts, bound or not. */
export const aliasFor = (ast: AST.Root, base = '__i18n_lang') => {
	const taken = new Set<string>()
	const seen = new Set<object>()

	const walk = (value: unknown) => {
		if (!value || typeof value !== 'object' || seen.has(value)) {
			return
		}

		seen.add(value)

		if (Array.isArray(value)) {
			value.forEach(walk)
			return
		}

		const node = value as { type?: string; name?: unknown; index?: unknown }

		if (node.type === 'Identifier' && typeof node.name === 'string') {
			taken.add(node.name)
		}

		// `let:name` without a value and an each block's index are plain strings.
		if ((node.type === 'LetDirective' || node.type === 'EachBlock') && typeof node.index === 'string') {
			taken.add(node.index)
		}

		if (node.type === 'LetDirective' && typeof node.name === 'string') {
			taken.add(node.name)
		}

		Object.values(node).forEach(walk)
	}

	walk(ast)

	let alias = base

	for (let suffix = 1; taken.has(alias); suffix++) {
		alias = `${base}${suffix}`
	}

	return alias
}

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

// Normalised text put back as markup: what entity decoding undid is redone.
const escapeMarkup = (text: string) =>
	text.replace(/[&<{}]/g, char => ({ '&': '&amp;', '<': '&lt;', '{': '&#123;', '}': '&#125;' })[char]!)

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
	rewrites: Edit[] = [],
	alias = '__i18n_lang'
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
			const problem = validateTranslation(segment.source, translation, segment.sealed)

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
							.map(i => `${alias}.t.str((${spliced(code, segment.expressions[i]!, rewrites)}))`)
							.join(', ')}]`
					: ''

			// An unchanged run stays markup, since a call is not allowed everywhere
			// (table rows, beside an explicit children snippet).
			const literal = run.tokens
				.map(token =>
					token.type === 'text'
						? escapeMarkup(token.value)
						: `{${spliced(code, segment.expressions[(token as { index: number }).index]!, rewrites)}}`
				)
				.join('')

			const text = changed.length > 0 ? `{${alias}.t.pick(${source}, {${changed.join(',')}}${values})}` : literal

			return { run, changed, text }
		})

		if (!calls.some(call => call.changed.length > 0)) {
			continue
		}

		// Once one run is a call, Svelte's boundary trimming no longer reaches
		// its neighbours, so every run of the body is emitted normalised, and
		// whitespace Svelte would have dropped goes with it.
		for (const { run, changed, text } of calls) {
			// A gap that is empty in the source still gets a call when a
			// translation puts text there; it lands at the gap's offset, or
			// over the whitespace that was normalised away.
			if (run.tokens.length === 0 && changed.length === 0) {
				edits.push(...run.dropped.map(range => ({ ...range, text: '' })))
				continue
			}

			edits.push({ start: run.start, end: run.end, text })
			translated ||= changed.length > 0
		}
	}

	return { edits, translated }
}
