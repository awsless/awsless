import { dirname, resolve } from 'path'
import { Node, walk } from 'estree-walker'
import { parseSync } from 'oxc-parser'

type TsImportEquals = {
	type: string
	moduleReference: { type: string; expression: { value: string } }
}

export const findImports = async (file: string, code: string) => {
	// The parser collects syntax errors instead of throwing, but a half
	// parsed file would produce a cache key that misses dependencies,
	// so any error must stop the build.
	const ast = parseSync(file, code)

	if (ast.errors.length > 0) {
		throw new Error(`Failed to parse: ${file}`, { cause: ast.errors[0] })
	}

	const importing = new Set<string>()

	walk(ast.program as Node, {
		enter(node) {
			if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration') {
				importing.add(node.source.value as string)
			}

			if (node.type === 'ExportNamedDeclaration' && node.source) {
				importing.add(node.source.value as string)
			}

			if (node.type === 'ImportExpression' && node.source.type === 'Literal') {
				importing.add(node.source.value as string)
			}

			// A typescript only node, unknown to the estree node union.
			const importEquals = node as unknown as TsImportEquals

			if (
				importEquals.type === 'TSImportEqualsDeclaration' &&
				importEquals.moduleReference.type === 'TSExternalModuleReference'
			) {
				importing.add(importEquals.moduleReference.expression.value)
			}
		},
	})

	return [...importing].map(importee => {
		if (importee.startsWith('.')) {
			return resolve(dirname(file), importee)
		}

		const parts = importee.split('/')

		if (parts.length > 2) {
			return parts.slice(0, 2).join('/')
		}

		return importee
	})
}
