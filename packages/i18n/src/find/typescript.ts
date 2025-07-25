import { parse, TaggedTemplateExpression } from '@swc/core'
import { simple } from 'swc-walk'

export const findTypescriptTranslatable = async (code: string) => {
	const found: string[] = []

	const ast = await parse(code, {
		syntax: 'typescript',
	})

	simple(ast, {
		TaggedTemplateExpression(node: TaggedTemplateExpression) {
			if (
				node.tag.type === 'MemberExpression' &&
				node.tag.object.type === 'Identifier' &&
				node.tag.object.value === 'lang' &&
				node.tag.property.type === 'Identifier' &&
				node.tag.property.value === 't'
			) {
				const content = code.substring(
					node.template.span.start - ast.span.start + 1,
					node.template.span.end - ast.span.start - 1
				)

				found.push(content)
			}
		},
	})

	return found
}
