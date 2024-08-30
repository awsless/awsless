import { CallExpression, ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, parse } from '@swc/core'
import { dirname, resolve } from 'path'
import { simple } from 'swc-walk'

export const findImports = async (file: string, code: string) => {
	const ast = await parse(code, {
		syntax: 'typescript',
	})

	const importing = new Set<string>()

	simple(ast, {
		ImportDeclaration(node: ImportDeclaration) {
			importing.add(node.source.value)
		},
		ExportAllDeclaration(node: ExportAllDeclaration) {
			importing.add(node.source.value)
		},
		ExportNamedDeclaration(node: ExportNamedDeclaration) {
			if (node.source) {
				importing.add(node.source.value)
			}
		},
		CallExpression(node: CallExpression) {
			if (node.callee.type === 'Import') {
				const first = node.arguments.at(0)
				if (first && first.expression.type === 'StringLiteral') {
					importing.add(first.expression.value)
				}
			}
		},
	})

	return [...importing].map(importee => {
		if (importee.startsWith('.')) {
			return resolve(dirname(file), importee)
		}

		return importee
	})
}
