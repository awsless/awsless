// The text inside a <T> component is sent to the translator as one string
// with its markup reduced to bare tags and placeholders, for example:
//   Hello <b>{user.name}</b>, you have <Link>{count} new messages</Link>.
// The translator may move tags and placeholders around, so the result is
// rebuilt into a tree that the T component renders at runtime.

export type Tree = Array<string | [number] | [number, Tree]>

export type TokenNode = {
	id: number
	label: string
	kind: 'element' | 'expression'
	leaf: boolean
	/** The placeholder prefix: "{" or "${" */
	prefix: string
}

export type Token = { kind: 'text'; text: string } | { kind: 'open' | 'close' | 'leaf'; id: number }

const TOKEN = /<(\/?)([A-Za-z][\w.:-]*)\s*(\/?)>|(\$?)\{([^{}]*)\}/g

/** Split a source string into text and the nodes it references. */
export const parseSource = (source: string) => {
	const tokens: Token[] = []
	const nodes: TokenNode[] = []
	const open: TokenNode[] = []
	let last = 0

	const text = (end: number) => {
		if (end > last) {
			tokens.push({ kind: 'text', text: source.slice(last, end) })
		}
	}

	for (const match of source.matchAll(TOKEN)) {
		text(match.index)
		last = match.index + match[0].length

		const [, closing, tag, selfClosing, prefix, expression] = match

		if (tag && closing) {
			const node = open.pop()

			// Only well formed sources are produced by the finder, so a
			// stray closing tag is treated as text.
			if (node?.label !== tag) {
				if (node) open.push(node)
				tokens.push({ kind: 'text', text: match[0] })
				continue
			}

			tokens.push({ kind: 'close', id: node.id })
			continue
		}

		const node: TokenNode = tag
			? { id: nodes.length, label: tag, kind: 'element', leaf: !!selfClosing, prefix: '' }
			: { id: nodes.length, label: expression!, kind: 'expression', leaf: true, prefix: prefix + '{' }

		nodes.push(node)

		if (node.leaf) {
			tokens.push({ kind: 'leaf', id: node.id })
		} else {
			open.push(node)
			tokens.push({ kind: 'open', id: node.id })
		}
	}

	text(source.length)

	return { tokens, nodes }
}

/** Split a translation into text and the nodes of its source. */
export const tokenizeTranslation = (translation: string, nodes: TokenNode[]) => {
	// Identical placeholders are interchangeable, so they are handed out in
	// order of appearance.
	const candidates = new Map<string, { kind: 'open' | 'close' | 'leaf'; ids: number[] }>()

	const add = (text: string, kind: 'open' | 'close' | 'leaf', id: number) => {
		const entry = candidates.get(text) ?? { kind, ids: [] }
		entry.ids.push(id)
		candidates.set(text, entry)
	}

	for (const node of nodes) {
		if (node.kind === 'expression') {
			add(`${node.prefix}${node.label}}`, 'leaf', node.id)
		} else if (node.leaf) {
			add(`<${node.label}/>`, 'leaf', node.id)
			add(`<${node.label} />`, 'leaf', node.id)
			add(`<${node.label}>`, 'leaf', node.id)
		} else {
			add(`<${node.label}>`, 'open', node.id)
			add(`</${node.label}>`, 'close', node.id)
		}
	}

	// Longest first, so <b_1> can't be mistaken for <b>
	const texts = [...candidates.keys()].toSorted((a, b) => b.length - a.length)
	const tokens: Token[] = []
	let text = ''

	for (let i = 0; i < translation.length; i++) {
		const char = translation[i]

		if (char === '<' || char === '{' || char === '$') {
			const found = texts.find(t => translation.startsWith(t, i))

			if (found) {
				const entry = candidates.get(found)!

				if (text) {
					tokens.push({ kind: 'text', text })
					text = ''
				}

				// Closing tags share the id order of their opening tags.
				tokens.push({ kind: entry.kind, id: entry.ids[0]! })
				if (entry.kind !== 'close') {
					entry.ids.push(entry.ids.shift()!)
				}

				i += found.length - 1
				continue
			}
		}

		text += char
	}

	if (text) {
		tokens.push({ kind: 'text', text })
	}

	return tokens
}

/** Build the render tree. Returns an error when the nodes of the source
 * are not all used exactly once. */
export const buildTree = (
	tokens: Token[],
	nodes: TokenNode[],
	decode: (text: string) => string = text => text
): { tree: Tree; error?: undefined } | { tree?: undefined; error: string } => {
	const root: Tree = []
	const stack: { id?: number; children: Tree }[] = [{ children: root }]
	const used = new Map<number, number>()

	const use = (id: number) => used.set(id, (used.get(id) ?? 0) + 1)
	const describe = (id: number) => {
		const node = nodes[id]!
		return node.kind === 'element' ? `<${node.label}>` : `${node.prefix}${node.label}}`
	}

	for (const token of tokens) {
		const parent = stack.at(-1)!

		if (token.kind === 'text') {
			const last = parent.children.at(-1)

			if (typeof last === 'string') {
				parent.children[parent.children.length - 1] = last + decode(token.text)
			} else {
				parent.children.push(decode(token.text))
			}
		} else if (token.kind === 'leaf') {
			use(token.id)
			parent.children.push([token.id])
		} else if (token.kind === 'open') {
			use(token.id)
			const children: Tree = []
			parent.children.push([token.id, children])
			stack.push({ id: token.id, children })
		} else if (parent.id === token.id) {
			stack.pop()
		} else {
			return { error: `unexpected closing tag for ${describe(token.id)}` }
		}
	}

	if (stack.length > 1) {
		return { error: `missing closing tag for ${describe(stack.at(-1)!.id!)}` }
	}

	for (const node of nodes) {
		const count = used.get(node.id) ?? 0

		if (count !== 1) {
			return { error: `${describe(node.id)} is ${count === 0 ? 'missing' : 'used more than once'}` }
		}
	}

	return { tree: root }
}

/** Check that a translation keeps every tag and placeholder of its source.
 * Returns the problem, or nothing when the translation is fine. */
export const validateTranslation = (source: string, translation: string) => {
	const { nodes } = parseSource(source)

	if (nodes.length === 0) {
		return
	}

	return buildTree(tokenizeTranslation(translation, nodes), nodes).error
}
