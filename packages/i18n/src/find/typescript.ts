import { parse, TaggedTemplateExpression } from '@swc/core'
import { simple } from 'swc-walk'

export const findTypescriptTranslatable = async (code: string) => {
	const found: string[] = []

	const ast = await parse(code, {
		syntax: 'typescript',
		script: true,
	})

	simple(ast, {
		TaggedTemplateExpression(node: TaggedTemplateExpression) {
			if (
				node.tag.type === 'CallExpression' &&
				node.tag.callee.type === 'Identifier' &&
				node.tag.callee.value === 'get' &&
				node.template.type === 'TemplateLiteral'
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
