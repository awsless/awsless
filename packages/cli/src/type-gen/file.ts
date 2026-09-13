import { camelCase } from 'change-case'
import { TypeObject } from './object.js'

export class TypeFile {
	protected codes = new Set<string>()
	protected interfaces = new Map<string, string>()
	protected imports = new Map<string | Record<string, string>, string>()

	constructor(readonly module: string) {}

	addImport(varName: string | Record<string, string>, path: string) {
		// Explicit .ts extensions only resolve when the app's tsconfig
		// sets allowImportingTsExtensions - without it every import
		// silently types as `any`. Extensionless paths resolve anywhere.
		this.imports.set(varName, path.replace(/\.(ts|tsx|mts)$/, ''))
		return this
	}

	addCode(code: string) {
		this.codes.add(code)
		return this
	}

	addInterface(name: string, type: string | TypeObject) {
		const value = type.toString()

		if (value) {
			this.interfaces.set(name, value)
		}

		return this
	}

	toString() {
		if (this.interfaces.size === 0) {
			return
		}

		const lines: string[] = []

		if (this.imports.size > 0) {
			lines.push(
				'// Imports',
				...Array.from(this.imports.entries()).map(([varName, path]) => {
					if (typeof varName === 'string') {
						return `import ${camelCase(varName)} from '${path}'`
					}

					return `import { ${Object.entries(varName)
						.map(([key, alias]) => `${key} as ${camelCase(alias)}`)
						.join(', ')} } from '${path}'`
				}),
				''
			)
		}

		if (this.codes.size > 0) {
			lines.push('// Types', ...Array.from(this.codes).map(v => v.trim()), '')
		}

		return [
			...lines,

			'// Extend module',
			`declare module '${this.module}' {`,
			Array.from(this.interfaces)
				.map(([name, type]) => {
					return `\tinterface ${name} ${type}`
				})
				.join('\n\n'),
			`}`,
			'',

			'// Export fix',
			`export {}`,
		].join('\n')
	}
}
