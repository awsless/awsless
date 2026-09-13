import { Node, walk } from 'estree-walker'
import { parseSync } from 'oxc-parser'
import { Source, Tagged } from '../find'

export const findTypescriptTagged = (code: string) => {
	const found: Tagged[] = []
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
				const { start, end } = node as Node & { start: number; end: number }
				const quasi = node.quasi as Node & { start: number; end: number }

				found.push({ start, end, source: code.slice(quasi.start + 1, quasi.end - 1) })
			}
		},
	})

	return found
}

export const findTypescriptTranslatable = (code: string): Source[] =>
	findTypescriptTagged(code).map(item => ({ source: item.source, kind: 't' }))
