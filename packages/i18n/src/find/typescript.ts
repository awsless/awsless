import { parse, Statement } from '@swc/core'
import { simple } from 'swc-walk'
import { BaseVisitor } from 'swc-walk/baseVisitor'
import type { Callback } from 'swc-walk/types'

// Newer swc versions wrap every function body in a FunctionBody node
// that the swc-walk base visitor doesn't know yet, so walking any code
// containing a function would fail without this extension.
class PatchedBaseVisitor extends BaseVisitor {
	FunctionBody(node: { stmts: Statement[] }, state: unknown, callback: Callback<unknown>) {
		for (const statement of node.stmts) {
			callback(statement, state)
		}
	}
}

const baseVisitor = new PatchedBaseVisitor()

export const findTypescriptTranslatable = async (code: string) => {
	const found: string[] = []

	const ast = await parse(code, { syntax: 'typescript' })
	const bytes = Buffer.from(code, 'utf8')

	simple(
		ast,
		{
			TaggedTemplateExpression(node) {
				if (
					node.tag.type === 'MemberExpression' &&
					node.tag.object.type === 'Identifier' &&
					node.tag.object.value === 'lang' &&
					node.tag.property.type === 'Identifier' &&
					node.tag.property.value === 't'
				) {
					const content = bytes
						.subarray(
							node.template.span.start - ast.span.start + 1,
							node.template.span.end - ast.span.start - 1
						)
						.toString('utf8')

					found.push(content)
				}
			},
		},
		baseVisitor
	)

	return found
}
