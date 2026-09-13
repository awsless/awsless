import { Node, walk } from 'estree-walker'
import lineColumn from 'line-column'
import { parse as parseSvelte } from 'svelte/compiler'
import { Source } from '../find'
import { collectSources, findTComponents, hasT } from '../t'

export const findSvelteTranslatable = (code: string, file?: string) => {
	const found: Source[] = []
	const origin = lineColumn(code)
	const ast = parseSvelte(code)

	const enter = (node: Node) => {
		if (
			node.type === 'TaggedTemplateExpression' &&
			node.tag.type === 'MemberExpression' &&
			node.tag.object.type === 'Identifier' &&
			node.tag.object.name === 'lang' &&
			node.tag.property.type === 'Identifier' &&
			node.tag.property.name === 't' &&
			node.quasi.type === 'TemplateLiteral' &&
			node.quasi.loc
		) {
			const start = node.quasi.loc.start
			const end = node.quasi.loc.end
			const content = code.substring(
				origin.toIndex(start.line, start.column) + 2,
				origin.toIndex(end.line, end.column)
			)

			found.push({ source: content, kind: 't' })
		}
	}

	walk(ast.html as Node, { enter })

	if (ast.instance) {
		walk(ast.instance.content, { enter })
	}

	if (ast.module) {
		walk(ast.module.content, { enter })
	}

	if (hasT(code)) {
		for (const component of findTComponents(code, file)) {
			found.push(...collectSources(component).map(source => ({ source, kind: 'markup' as const })))
		}
	}

	return found
}
