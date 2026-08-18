import { parse, ParseOptions, Statement } from '@swc/core'
import { dirname, resolve } from 'path'
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

const parseOptions = (file: string): ParseOptions => {
	if (file.endsWith('.tsx')) {
		return { syntax: 'typescript', tsx: true, decorators: true }
	}

	if (file.endsWith('.ts') || file.endsWith('.mts') || file.endsWith('.cts')) {
		return { syntax: 'typescript', decorators: true }
	}

	return { syntax: 'ecmascript', jsx: true, decorators: true }
}

export const findImports = async (file: string, code: string) => {
	let ast

	try {
		ast = await parse(code, parseOptions(file))
	} catch (error) {
		throw new Error(`Failed to parse: ${file}`, { cause: error })
	}

	const importing = new Set<string>()

	try {
		simple(ast, {
			ImportDeclaration(node) {
				importing.add(node.source.value)
			},
			ExportAllDeclaration(node) {
				importing.add(node.source.value)
			},
			ExportNamedDeclaration(node) {
				if (node.source) {
					importing.add(node.source.value)
				}
			},
			CallExpression(node) {
				if (node.callee.type === 'Import') {
					const first = node.arguments.at(0)
					if (first && first.expression.type === 'StringLiteral') {
						importing.add(first.expression.value)
					}
				}
			},
			TsImportEqualsDeclaration(node) {
				if (node.moduleRef.type === 'TsExternalModuleReference') {
					importing.add(node.moduleRef.expression.value)
				}
			},
		}, baseVisitor)
	} catch (error) {
		// A silently ignored walk failure would produce a cache key that
		// misses dependencies, so the failure must stop the build.
		throw new Error(`Failed to walk the AST of: ${file}`, { cause: error })
	}

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
