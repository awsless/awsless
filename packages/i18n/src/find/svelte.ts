import { Node, walk } from 'estree-walker'
import { parse } from 'svelte/compiler'
import { Translatable } from '../find'

type SvelteNode = {
	type: string
	start: number
	end: number
	name?: string
	raw?: string
	data?: string
	value?: true | SvelteNode | SvelteNode[]
	attributes?: SvelteNode[]
	fragment?: { nodes: SvelteNode[] }
}

const ELEMENTS = new Set([
	'RegularElement',
	'SvelteElement',
	'Component',
	'SvelteComponent',
	'SvelteSelf',
	'SvelteFragment',
	'SvelteBoundary',
	'TitleElement',
	'SlotElement',
])

const LEAVES = new Set(['ExpressionTag', 'HtmlTag', 'RenderTag'])

export type ComponentMatch = { start: number; end: number } & (
	| { error: string; source?: undefined; snippets?: undefined; context?: undefined }
	| {
			error?: undefined
			/** The source text sent to the translator, see tree.ts */
			source: string
			/** The markup that renders each node, by node id */
			snippets: string[]
			/** A hint for the translator, taken from the context attribute */
			context?: string
	  }
)

type Part = string | ElementPart | LeafPart
type ElementPart = { kind: 'element'; id: number; label: string; children: Part[] }
type LeafPart = { kind: 'leaf'; id: number; label: string; prefix: string }

const collapse = (text: string) => text.replace(/\s+/g, ' ')

export const parseSvelte = (code: string) => {
	const templates: string[] = []
	const components: ComponentMatch[] = []
	const ast = parse(code, { modern: true })

	const enter = (node: Node) => {
		if (
			node.type === 'TaggedTemplateExpression' &&
			node.tag.type === 'MemberExpression' &&
			node.tag.object.type === 'Identifier' &&
			node.tag.object.name === 'lang' &&
			node.tag.property.type === 'Identifier' &&
			node.tag.property.name === 't'
		) {
			const quasi = node.quasi as Node & { start: number; end: number }
			templates.push(code.slice(quasi.start + 1, quasi.end - 1))
		}
	}

	walk(ast.fragment as unknown as Node, {
		enter(node) {
			enter(node)

			const component = node as unknown as SvelteNode

			if (component.type === 'Component' && component.name === 'T') {
				// The walk continues into the children, so lang.t calls
				// inside a <T> are still found and translated.
				components.push(extract(code, component))
			}
		},
	})

	if (ast.instance) {
		walk(ast.instance.content as Node, { enter })
	}

	if (ast.module) {
		walk(ast.module.content as Node, { enter })
	}

	return { templates, components }
}

const extract = (code: string, component: SvelteNode): ComponentMatch => {
	const { start, end } = component
	const snippets: string[] = []
	const labels = new Map<string, LeafPart[] | ElementPart[]>()

	const label = (part: ElementPart | LeafPart, key: string) => {
		const list = labels.get(key) ?? []
		list.push(part as never)
		labels.set(key, list)
	}

	const collect = (nodes: SvelteNode[]): Part[] | string => {
		const parts: Part[] = []

		for (const node of nodes) {
			if (node.type === 'Text') {
				parts.push(collapse(node.raw!))
			} else if (node.type === 'Comment') {
				continue
			} else if (LEAVES.has(node.type)) {
				const expression = collapse(code.slice(node.start + 1, node.end - 1))
				const part: LeafPart = { kind: 'leaf', id: snippets.length, label: expression, prefix: '{' }
				snippets.push(code.slice(node.start, node.end))

				// Braces inside the placeholder would break the token grammar.
				label(part, /[{}]/.test(expression) ? 'expr' : expression)
				parts.push(part)
			} else if (ELEMENTS.has(node.type)) {
				if (node.name === 'T') {
					return 'nested <T> components are not supported'
				}

				const id = snippets.length
				snippets.push('')

				const children = collect(node.fragment!.nodes)

				if (typeof children === 'string') {
					return children
				}

				if (children.length === 0) {
					const part: LeafPart = { kind: 'leaf', id, label: node.name!, prefix: '<' }
					snippets[id] = code.slice(node.start, node.end)
					label(part, node.name!)
					parts.push(part)
				} else {
					const first = node.fragment!.nodes[0]!
					const last = node.fragment!.nodes.at(-1)!
					const part: ElementPart = { kind: 'element', id, label: node.name!, children }
					snippets[id] =
						code.slice(node.start, first.start) + '{@render c()}' + code.slice(last.end, node.end)
					label(part, node.name!)
					parts.push(part)
				}
			} else {
				return `{#${node.type.replace(/Block$|Tag$/, '').toLowerCase()}} is not supported inside <T>`
			}
		}

		return trim(parts)
	}

	const context = readContext(component)

	if (typeof context === 'object') {
		return { start, end, error: context.error }
	}

	const parts = collect(component.fragment!.nodes)

	if (typeof parts === 'string') {
		return { start, end, error: parts }
	}

	// Repeated names get a suffix so a translation can't mix them up.
	// Identical expressions render the same, so they may share a label.
	for (const [key, list] of labels) {
		const distinct = new Set(list.map(part => snippets[part.id]))

		if (distinct.size > 1 || (list[0]!.kind === 'element' && list.length > 1)) {
			list.forEach((part, index) => {
				part.label = `${key}_${index + 1}`
			})
		} else {
			list.forEach(part => {
				part.label = key
			})
		}
	}

	return {
		start,
		end,
		source: serialize(parts),
		snippets,
		context,
	}
}

// The context is a hint for the translator only, so it has to be known
// at build time. Any other attribute would be dropped, so it's an error.
const readContext = (component: SvelteNode): string | undefined | { error: string } => {
	let context: string | undefined

	for (const attribute of component.attributes ?? []) {
		if (attribute.type !== 'Attribute' || attribute.name !== 'context') {
			return { error: `<T> only supports the context attribute` }
		}

		const value = Array.isArray(attribute.value) ? attribute.value : [attribute.value]

		if (value.length !== 1 || typeof value[0] !== 'object' || value[0].type !== 'Text') {
			return { error: `the context of a <T> must be plain text` }
		}

		context = collapse(value[0].data!).trim()
	}

	return context
}

// Whitespace is collapsed and trimmed at the edges of every fragment,
// which is what the svelte compiler does with static text.
const trim = (parts: Part[]) => {
	const merged: Part[] = []

	for (const part of parts) {
		const last = merged.at(-1)

		if (typeof part === 'string' && typeof last === 'string') {
			merged[merged.length - 1] = collapse(last + part)
		} else {
			merged.push(part)
		}
	}

	const first = merged[0]
	const last = merged.at(-1)

	if (typeof first === 'string') {
		merged[0] = first.trimStart()
	}

	if (typeof last === 'string') {
		merged[merged.length - 1] = last.trimEnd()
	}

	return merged.filter(part => part !== '')
}

const serialize = (parts: Part[]): string => {
	return parts
		.map(part => {
			if (typeof part === 'string') {
				return part
			}

			if (part.kind === 'leaf') {
				return part.prefix === '<' ? `<${part.label}/>` : `{${part.label}}`
			}

			return `<${part.label}>${serialize(part.children)}</${part.label}>`
		})
		.join('')
}

export const findSvelteTranslatable = (code: string): Translatable[] => {
	const { templates, components } = parseSvelte(code)

	return [
		...templates.map(source => ({ source })),
		...components
			.filter(match => !match.error && match.source)
			.map(match => ({ source: match.source!, context: match.context })),
	]
}
