
import { mkdir, writeFile } from "fs/promises"
import { Config } from '../config.js'
import { defaultPlugins } from '../plugins/index.js'
import { directories } from './path.js'
import { join, relative } from "path"
import { camelCase, constantCase } from "change-case"

export const generateResourceTypes = async (config:Config) => {
	const plugins = [
		...defaultPlugins,
		...(config.plugins || [])
	]

	const files: string[] = []

	for(const plugin of plugins) {
		const code = plugin.onTypeGen?.({ config })

		if(code) {
			const file = join(directories.types, `${ plugin.name }.d.ts`)
			files.push(relative(directories.root, file))

			await mkdir(directories.types, { recursive: true })
			await writeFile(file, code)
		}
	}

	if(files.length) {
		const code = files.map(file => `/// <reference path='${ file }' />`).join('\n')
		await writeFile(join(directories.root, `awsless.d.ts`), code)
	}
}

export class TypeGen {
	protected codes = new Set<string>()
	protected types = new Map<string, string>()
	protected imports = new Map<string, string>()

	constructor(
		readonly module: string,
		readonly interfaceName:string,
		readonly readonly = true,
	) {}

	addImport(varName:string, path: string) {
		this.imports.set(varName, path)
		return this
	}

	addCode(code: string) {
		this.codes.add(code)
		return this
	}

	addType(name: string, type: string) {
		if(type) {
			this.types.set(camelCase(name), type)
		}

		return this
	}

	addConst(name: string, type: string) {
		if(type) {
			this.types.set(constantCase(name), type)
		}

		return this
	}

	toString() {
		if(this.types.size === 0) {
			return
		}

		const lines: string[] = []

		if(this.imports.size > 0) {
			lines.push(...[
				'// Imports',
				...Array.from(this.imports.entries()).map(([varName, path]) => {
					return `import ${camelCase(varName)} from '${path}'`
				}),
				'',
			])
		}

		if(this.codes.size > 0) {
			lines.push(...[
				'// Types',
				...Array.from(this.codes).map(v => v.trim()),
				'',
			])
		}

		return [
			...lines,

			'// Extend module',
			`declare module '${this.module}' {`,
			`\tinterface ${this.interfaceName} {`,
			...Array.from(this.types.entries()).map(([ propName, type ]) => {
				return `\t\t${this.readonly ? 'readonly ' : ''}${propName}: ${type}`
			}),
			`\t}`,
			`}`,
			'',

			'// Export fix',
			`export {}`,
		].join('\n')
	}
}

export class TypeObject {
	protected types = new Map<string, string>()

	addType(name:string, type: string) {
		if(type) {
			this.types.set(camelCase(name), type)
		}

		return this
	}

	addConst(name: string, type: string) {
		if(type) {
			this.types.set(constantCase(name), type)
		}

		return this
	}

	toString() {
		if(!this.types.size) {
			return ''
		}

		return [
			'{',
			...Array.from(this.types.entries()).map(([ propName, type ]) => {
				return `\t\t\treadonly ${propName}: ${type}`
			}),
			'\t\t}'
		].join('\n')
	}
}
