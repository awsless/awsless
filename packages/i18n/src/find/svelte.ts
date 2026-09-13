import { AST } from 'svelte/compiler'
import { Source, Tagged } from '../find'
import { collectSources, parseT } from '../t'

type Range = { start: number; end: number }

// Only a plain `lang.t`; `lang[t]` is somebody else's call.
const isLangT = (tag: unknown) => {
	const node = tag as {
		type?: string
		computed?: boolean
		object?: { type?: string; name?: string }
		property?: { type?: string; name?: string }
	}

	return (
		node.type === 'MemberExpression' &&
		node.computed === false &&
		node.object?.type === 'Identifier' &&
		node.object.name === 'lang' &&
		node.property?.type === 'Identifier' &&
		node.property.name === 't'
	)
}

// Visits every node once, wherever it sits: script, template, attributes or
// blocks. The AST shares some objects between branches, hence the set.
export const findTaggedTemplates = (ast: AST.Root, code: string) => {
	const found: Tagged[] = []
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

		const node = value as Record<string, unknown>

		if (node.type === 'TaggedTemplateExpression' && isLangT(node.tag)) {
			const { start, end } = node as unknown as Range
			const quasi = node.quasi as Range

			found.push({ start, end, source: code.slice(quasi.start + 1, quasi.end - 1) })
		}

		Object.values(node).forEach(walk)
	}

	walk(ast)

	return found.toSorted((a, b) => a.start - b.start)
}

export const findSvelteTranslatable = (code: string, file?: string, preserveWhitespace = false): Source[] => {
	const { ast, components } = parseT(code, file, preserveWhitespace)

	return [
		...findTaggedTemplates(ast, code).map(item => ({ source: item.source, kind: 't' as const })),
		...components.flatMap(component =>
			collectSources(component).map(item => ({ ...item, kind: 'markup' as const }))
		),
	]
}
