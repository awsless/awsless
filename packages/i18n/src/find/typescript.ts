import { Node, walk } from 'estree-walker'
import { parseSync } from 'oxc-parser'
import { Translatable } from '../find'

export const findTypescriptTranslatable = (code: string) => {
	const found: Translatable[] = []
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

				found.push({ source: code.slice(quasi.start + 1, quasi.end - 1) })
			}
		},
	})

	return found
}
