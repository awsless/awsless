import { mkdir, writeFile } from 'fs/promises'
import { Config } from '../config.js'
import { defaultPlugins } from '../plugins/index.js'
import { directories } from './path.js'
import { dirname, join, relative } from 'path'
import { camelCase, constantCase } from 'change-case'

export const generateResourceTypes = async (config: Config) => {
	const plugins = [...defaultPlugins, ...(config.plugins || [])]

	const files: string[] = []

	await Promise.all(
		plugins.map(plugin => {
			return plugin.onTypeGen?.({
				config,
				async write(file, data, include = false) {
					const code = data?.toString('utf8')
					const path = join(directories.types, file)

					if (code) {
						if (include) {
							files.push(relative(directories.root, path))
						}

						await mkdir(dirname(path), { recursive: true })
						await writeFile(path, code)
					}
				},
			})
		})
	)

	if (files.length) {
		const code = files.map(file => `/// <reference path='${file}' />`).join('\n')
		await writeFile(join(directories.root, `awsless.d.ts`), code)
	}
}

export class TypeGen {
	protected codes = new Set<string>()
	protected interfaces = new Map<string, string>()
	protected imports = new Map<string | Record<string, string>, string>()

	constructor(readonly module: string) {}

	addImport(varName: string | Record<string, string>, path: string) {
		this.imports.set(varName, path)
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

	// addConst(name: string, type: string) {
	// 	if (type) {
	// 		this.types.set(constantCase(name), type)
	// 	}

	// 	return this
	// }

	toString() {
		if (this.interfaces.size === 0) {
			return
		}

		const lines: string[] = []

		if (this.imports.size > 0) {
			lines.push(
				...[
					'// Imports',
					...Array.from(this.imports.entries()).map(([varName, path]) => {
						if (typeof varName === 'string') {
							return `import ${camelCase(varName)} from '${path}'`
						}

						return `import { ${Object.entries(varName)
							.map(([key, alias]) => `${key} as ${camelCase(alias)}`)
							.join(', ')} } from '${path}'`
					}),
					'',
				]
			)
		}

		if (this.codes.size > 0) {
			lines.push(...['// Types', ...Array.from(this.codes).map(v => v.trim()), ''])
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

			// ...Array.from(this.types.entries()).map(([propName, type]) => { // `\tinterface ${this.interfaceName} {`,
			// 	return `\t\t${this.readonly ? 'readonly ' : ''}${propName}: ${type}`
			// }),
			// `\t}`,
			`}`,
			'',

			'// Export fix',
			`export {}`,
		].join('\n')
	}
}

// export class TypeInterface {
// 	protected types = new Map<string, string>()

// 	constructor(readonly interfaceName: string, readonly readonly = true) {}

// 	addType(name: string, type: string) {
// 		if (type) {
// 			this.types.set(camelCase(name), type)
// 		}

// 		return this
// 	}

// 	addConst(name: string, type: string) {
// 		if (type) {
// 			this.types.set(constantCase(name), type)
// 		}

// 		return this
// 	}

// 	toString() {
// 		if (!this.types.size) {
// 			return ''
// 		}

// 		return [
// 			`\tinterface ${this.interfaceName} {`,
// 			...Array.from(this.types.entries()).map(([propName, type]) => {
// 				return `\t\t${this.readonly ? 'readonly ' : ''}${propName}: ${type}`
// 			}),
// 			`\t}`,
// 		].join('\n')
// 	}
// }

export class TypeObject {
	protected types = new Map<string, string>()

	constructor(readonly level: number, readonly readonly = true) {}

	add(name: string, type: string | TypeObject) {
		const value = type.toString()

		if (value) {
			this.types.set(name, value)
		}

		return this
	}

	addType(name: string, type: string | TypeObject) {
		return this.add(camelCase(name), type)
	}

	addConst(name: string, type: string | TypeObject) {
		return this.add(constantCase(name), type)
	}

	toString() {
		if (!this.types.size) {
			return ''
		}

		return [
			'{',
			...Array.from(this.types.entries()).map(([propName, type]) => {
				// return `\t\t\t${this.readonly ? 'readonly ' : ''} ${propName}: ${type}`
				return [
					'\t'.repeat(this.level + 1),
					this.readonly ? 'readonly' : '',
					' ',
					propName,
					': ',
					type,
				].join('')
			}),
			`${'\t'.repeat(this.level)}}`,
		].join('\n')
	}
}
