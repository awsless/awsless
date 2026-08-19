import { Node, walk } from 'estree-walker'
import { parseSync } from 'oxc-parser'

export const findTypescriptTranslatable = async (code: string) => {
	const found: string[] = []
	const ast = parseSync('module.ts', code)

	walk(ast.program as Node, {
		enter(node) {
			if (
				node.type === 'TaggedTemplateExpression' &&
				node.tag.type === 'MemberExpression' &&
				node.tag.object.type === 'Identifier' &&
				node.tag.object.name === 'lang' &&
				node.tag.property.type === 'Identifier' &&
				node.tag.property.name === 't'
			) {
				const quasi = node.quasi as Node & { start: number; end: number }

				found.push(code.slice(quasi.start + 1, quasi.end - 1))
			}
		},
	})

	return found
}
