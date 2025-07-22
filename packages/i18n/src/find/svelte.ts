import { Node, walk } from 'estree-walker'
import lineColumn from 'line-column'
import { parse as parseSvelte } from 'svelte/compiler'

export const findSvelteTranslatable = (code: string) => {
	const found: string[] = []
	const origin = lineColumn(code)
	const ast = parseSvelte(code, {
		css: false,
	})

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

			found.push(content)
		}
	}

	walk(ast.html as Node, { enter })

	if (ast.instance) {
		walk(ast.instance.content, { enter })
	}

	if (ast.module) {
		walk(ast.module.content, { enter })
	}

	return found
}
