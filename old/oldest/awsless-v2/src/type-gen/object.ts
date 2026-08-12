import { camelCase, constantCase } from 'change-case'

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
