import lineColumn from 'line-column'
import { AST, parse } from 'svelte/compiler'

// Svelte puts offsets on every node, the estree types just don't declare them.
type Range = { start: number; end: number }
const range = (node: unknown) => node as Range

type Part =
	| { kind: 'element'; node: AST.ElementLike; openEnd: number; closeStart: number }
	| { kind: 'block'; pieces: (string | Segment)[] }
	| { kind: 'verbatim'; source: string }

// One translatable string: the <T> children or a block branch body.
// Parts are the numbered tags, so parts[n - 1] is <n>.
export type Segment = {
	source: string
	parts: Part[]
	start: number
	end: number
}

export type TComponent = {
	start: number
	end: number
	segment: Segment
}

export const hasT = (code: string) => /<T[\s/>]/.test(code)

export const parseT = (code: string, file?: string) => {
	const ast = parse(code, { modern: true })
	const components: TComponent[] = []

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

	const segment = (nodes: AST.Fragment['nodes'], start: number, end: number): Segment => {
		const parts: Part[] = []
		let source = ''

		const visit = (nodes: AST.Fragment['nodes']) => {
			for (const node of nodes) {
				switch (node.type) {
					case 'Text': {
						const text = code.slice(node.start, node.end).replace(/\s+/g, ' ')
						// A skipped comment leaves two text nodes, their spaces merge into one.
						source += source.endsWith(' ') && text.startsWith(' ') ? text.slice(1) : text
						break
					}
					case 'Comment':
						break
					case 'ExpressionTag':
						source += '${' + code.slice(range(node.expression).start, range(node.expression).end) + '}'
						break
					case 'HtmlTag':
					case 'RenderTag':
					case 'ConstTag':
					case 'DebugTag':
					case 'AttachTag':
					case 'DeclarationTag':
						parts.push({ kind: 'verbatim', source: code.slice(node.start, node.end) })
						source += `<${parts.length}/>`
						break
					case 'IfBlock':
					case 'EachBlock':
					case 'AwaitBlock':
					case 'KeyBlock':
					case 'SnippetBlock':
						parts.push({ kind: 'block', pieces: blockPieces(node) })
						source += `<${parts.length}/>`
						break
					default: {
						if (node.type === 'Component' && node.name === 'T') {
							throw fail(node.start, 'nested <T> is not supported inside <T>')
						}

						const number = parts.length + 1
						const openEnd = tagEnd(node)
						const last = node.fragment.nodes.at(-1)

						parts.push({ kind: 'element', node, openEnd, closeStart: last ? last.end : openEnd })

						if (last) {
							source += `<${number}>`
							visit(node.fragment.nodes)
							source += `</${number}>`
						} else {
							source += `<${number}/>`
						}
					}
				}
			}
		}

		visit(nodes)

		return { source: source.trim(), parts, start, end }
	}

	type Branch = { sepStart?: number; bodyStart: number; nodes: AST.Fragment['nodes'] }

	// Body boundaries come from the AST, the syntax between them is copied as is.
	const blockPieces = (node: AST.Block) => {
		const branches: Branch[] = []
		let closeStart = node.end

		const afterBrace = (from: number) => code.indexOf('}', from) + 1
		const separator = (keyword: string, body: AST.Fragment, next: number) =>
			code.lastIndexOf(`{:${keyword}`, body.nodes[0]?.start ?? next)

		switch (node.type) {
			case 'IfBlock': {
				closeStart = code.lastIndexOf('{/if', node.end)
				let current: AST.IfBlock = node

				while (true) {
					branches.push({
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
					branches.push({ sepStart, bodyStart: afterBrace(sepStart), nodes: alternate.nodes })
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

				branches.push({ bodyStart: afterBrace(anchor), nodes: node.body.nodes })

				if (node.fallback) {
					const sepStart = separator('else', node.fallback, closeStart)
					branches.push({ sepStart, bodyStart: afterBrace(sepStart), nodes: node.fallback.nodes })
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
						branches.unshift({ bodyStart: afterBrace(anchor), nodes: body.nodes })
					} else {
						const sepStart = separator(key, body, next)
						const anchor = pattern && range(pattern).start > sepStart ? range(pattern).end : sepStart
						branches.unshift({ sepStart, bodyStart: afterBrace(anchor), nodes: body.nodes })
						next = sepStart
					}
				}
				break
			}
			case 'KeyBlock': {
				closeStart = code.lastIndexOf('{/key', node.end)
				branches.push({ bodyStart: afterBrace(range(node.expression).end), nodes: node.fragment.nodes })
				break
			}
			case 'SnippetBlock': {
				closeStart = code.lastIndexOf('{/snippet', node.end)
				const anchor = Math.max(range(node.expression).end, ...node.parameters.map(p => range(p).end))
				branches.push({ bodyStart: afterBrace(anchor), nodes: node.body.nodes })
				break
			}
		}

		const pieces: (string | Segment)[] = []
		let cursor = node.start

		for (const [index, branch] of branches.entries()) {
			if (branch.sepStart !== undefined) {
				cursor = branch.sepStart
			}

			const bodyEnd = branches[index + 1]?.sepStart ?? closeStart

			pieces.push(code.slice(cursor, branch.bodyStart))
			pieces.push(segment(branch.nodes, branch.bodyStart, bodyEnd))
			cursor = bodyEnd
		}

		pieces.push(code.slice(closeStart, node.end))

		return pieces
	}

	const collect = (nodes: AST.Fragment['nodes']) => {
		for (const node of nodes) {
			if (node.type === 'Component' && node.name === 'T') {
				const openEnd = tagEnd(node)
				const last = node.fragment.nodes.at(-1)
				const closeStart = last ? last.end : openEnd

				components.push({
					start: node.start,
					end: node.end,
					segment: segment(node.fragment.nodes, openEnd, closeStart),
				})
				continue
			}

			for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
				const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]
				if (fragment?.type === 'Fragment') {
					collect(fragment.nodes)
				}
			}
		}
	}

	collect(ast.fragment.nodes)

	return { ast, components }
}

export const findTComponents = (code: string, file?: string) => parseT(code, file).components

export const collectSources = (segment: Segment): string[] => {
	const sources = segment.source ? [segment.source] : []

	for (const part of segment.parts) {
		if (part.kind === 'block') {
			for (const piece of part.pieces) {
				if (typeof piece !== 'string') {
					sources.push(...collectSources(piece))
				}
			}
		}
	}

	return sources
}

// ---------------------------------------------------------------------------
// Source strings & translations: `text ${expr} <1>text</1> <2/>`

type Token =
	| { type: 'text'; value: string }
	| { type: 'expr'; value: string }
	| { type: 'open' | 'close' | 'self'; n: number }

const tokenize = (text: string) => {
	const tokens: Token[] = []
	let i = 0
	let textStart = 0

	const flush = (end: number) => {
		if (end > textStart) {
			tokens.push({ type: 'text', value: text.slice(textStart, end) })
		}
	}

	while (i < text.length) {
		if (text.startsWith('${', i)) {
			let depth = 0
			let j = i + 1

			for (; j < text.length; j++) {
				if (text[j] === '{') {
					depth++
				} else if (text[j] === '}' && --depth === 0) {
					break
				}
			}

			if (j < text.length) {
				flush(i)
				tokens.push({ type: 'expr', value: text.slice(i + 2, j) })
				i = textStart = j + 1
				continue
			}
		}

		if (text[i] === '<') {
			const match = /^<(\/?)(\d+)\s*(\/?)>/.exec(text.slice(i))

			if (match && !(match[1] && match[3])) {
				flush(i)
				const n = Number(match[2])
				tokens.push(match[1] ? { type: 'close', n } : match[3] ? { type: 'self', n } : { type: 'open', n })
				i = textStart = i + match[0].length
				continue
			}
		}

		i++
	}

	flush(text.length)

	return tokens
}

type TreeNode =
	| { type: 'text'; value: string }
	| { type: 'expr'; value: string }
	| { type: 'tag'; n: number; children: TreeNode[] }

// Lenient on purpose: hand written overrides skip validation.
const toTree = (tokens: Token[]) => {
	const root: TreeNode[] = []
	const stack: { n: number; children: TreeNode[] }[] = []
	const top = () => stack.at(-1)?.children ?? root

	for (const token of tokens) {
		if (token.type === 'text' || token.type === 'expr') {
			top().push(token)
		} else if (token.type === 'self') {
			top().push({ type: 'tag', n: token.n, children: [] })
		} else if (token.type === 'open') {
			const node = { type: 'tag' as const, n: token.n, children: [] }
			top().push(node)
			stack.push(node)
		} else {
			const index = stack.findLastIndex(item => item.n === token.n)
			if (index !== -1) {
				stack.length = index
			}
		}
	}

	return root
}

type Shape = { error?: string; exprs: string[]; tags: Map<number, { self: boolean; parent: number }> }

const shape = (text: string): Shape => {
	const tags = new Map<number, { self: boolean; parent: number }>()
	const exprs: string[] = []
	const stack: number[] = []
	const invalid = (error: string) => ({ error, exprs, tags })

	for (const token of tokenize(text)) {
		if (token.type === 'text') {
			continue
		}

		if (token.type === 'expr') {
			exprs.push(token.value)
			continue
		}

		if (token.type === 'close') {
			if (stack.at(-1) !== token.n) {
				return invalid(`tag <${token.n}> is closed out of order`)
			}
			stack.pop()
			continue
		}

		if (tags.has(token.n)) {
			return invalid(`tag <${token.n}> appears twice`)
		}

		tags.set(token.n, { self: token.type === 'self', parent: stack.at(-1) ?? 0 })

		if (token.type === 'open') {
			stack.push(token.n)
		}
	}

	if (stack.length > 0) {
		return invalid(`tag <${stack.at(-1)}> is never closed`)
	}

	return { exprs: exprs.toSorted(), tags }
}

/** Returns what is wrong with the translation, or nothing when it keeps
 * all placeholders and numbered tags of the source. */
export const validateTranslation = (source: string, translation: string) => {
	const expected = shape(source)
	const actual = shape(translation)

	if (expected.error) {
		return undefined
	}

	if (actual.error) {
		return actual.error
	}

	if (expected.exprs.join(' ') !== actual.exprs.join(' ')) {
		return 'placeholders differ from the source'
	}

	if (expected.tags.size !== actual.tags.size) {
		return 'tags differ from the source'
	}

	for (const [n, tag] of expected.tags) {
		const other = actual.tags.get(n)

		if (!other || other.self !== tag.self || other.parent !== tag.parent) {
			return 'tags differ from the source'
		}
	}

	return undefined
}

// ---------------------------------------------------------------------------
// Rendering a <T> into svelte markup

export type Lookup = (source: string, locale: string) => string | undefined

const escapeText = (text: string) =>
	text.replace(/[{}<]/g, char => (char === '{' ? '&#123;' : char === '}' ? '&#125;' : '&lt;'))

const hasTranslation = (segment: Segment, locale: string, lookup: Lookup): boolean => {
	if (segment.source) {
		const translation = lookup(segment.source, locale)
		if (translation !== undefined && translation !== segment.source) {
			return true
		}
	}

	return segment.parts.some(
		part =>
			part.kind === 'block' &&
			part.pieces.some(piece => typeof piece !== 'string' && hasTranslation(piece, locale, lookup))
	)
}

/** The `{#if lang.locale === ...}` markup replacing a `<T>`, or nothing
 * when no locale has a translation for it. */
export const renderT = (component: TComponent, code: string, locales: string[], lookup: Lookup) => {
	const root = component.segment
	const branches = locales.filter(locale => hasTranslation(root, locale, lookup))

	if (branches.length === 0) {
		return undefined
	}

	const renderSegment = (segment: Segment, locale: string): string => {
		if (!segment.source) {
			return code.slice(segment.start, segment.end)
		}

		// The source itself goes through the renderer too, so a branch
		// without its own translation still renders translated blocks inside.
		const translation = lookup(segment.source, locale) ?? segment.source

		return renderNodes(toTree(tokenize(translation)), segment, locale)
	}

	const renderNodes = (nodes: TreeNode[], segment: Segment, locale: string): string => {
		let output = ''

		for (const node of nodes) {
			if (node.type === 'text') {
				output += escapeText(node.value)
				continue
			}

			if (node.type === 'expr') {
				output += `{${node.value}}`
				continue
			}

			const part = segment.parts[node.n - 1]

			if (!part) {
				throw new Error(`Translation of "${segment.source}" references <${node.n}> which is not in the source.`)
			}

			const inner = renderNodes(node.children, segment, locale)

			if (part.kind === 'verbatim') {
				output += part.source + inner
			} else if (part.kind === 'block') {
				output +=
					part.pieces
						.map(piece => (typeof piece === 'string' ? piece : renderSegment(piece, locale)))
						.join('') + inner
			} else if (node.children.length === 0) {
				output += code.slice(part.node.start, part.node.end)
			} else {
				output += code.slice(part.node.start, part.openEnd) + inner + code.slice(part.closeStart, part.node.end)
			}
		}

		return output
	}

	return (
		branches
			.map((locale, index) => {
				return `{${index === 0 ? '#if' : ':else if'} lang.locale === '${locale}'}` + renderSegment(root, locale)
			})
			.join('') + `{:else}${code.slice(root.start, root.end)}{/if}`
	)
}
