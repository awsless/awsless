import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { SET_KEY } from '../schema/set'
import { AnyTable } from '../table'

export type ExpressionAttributeNames = Record<string, string>
export type ExpressionAttributeValues = Record<string, AttributeValue>

export class ExpressionAttributes {
	#names = new Map<string, string>()
	#values = new Map<unknown, { id: string; value: AttributeValue }>()

	constructor(private table: AnyTable) {}

	path(path: Array<string | number>): string {
		// if (typeof path === 'string') {
		// 	return this.name(path)
		// }

		return path
			.map((name, index) => {
				if (typeof name === 'number') {
					return `[${name}]`
				}

				return `${index === 0 ? '' : '.'}${this.name(name)}`
			})
			.join('')
	}

	name(key: string): string {
		if (!this.#names.has(key)) {
			this.#names.set(key, `#n${this.#names.size + 1}`)
		}

		return this.#names.get(key)!
	}

	value(value: any, path: Array<string | number>): string {
		const schema = this.table.walk(...path)
		const marshalled = schema.marshall(value)

		return this.raw(marshalled)
	}

	innerSetValue(value: any, path: Array<string | number>): string {
		const schema = this.table.walk(...path)
		const marshalled = schema.marshall(value)

		return this.raw(marshalled.M[SET_KEY])
	}

	isSet(path: Array<string | number>): boolean {
		const schema = this.table.walk(...path)
		const type = schema.type

		return type === 'SS' || type === 'NS' || type === 'BS'
	}

	elementValue(value: any, path: Array<string | number>): string {
		const schema = this.table.walk(...path)
		const element = schema.walk?.()

		if (element) {
			return this.raw(element.marshall(value))
		}

		return this.raw(schema.marshall(value))
	}

	raw(value: any): string {
		let key: unknown

		try {
			key = JSON.stringify(value)
		} catch (_) {
			key = value
		}

		if (!this.#values.has(key)) {
			this.#values.set(key, {
				id: `:v${this.#values.size + 1}`,
				value: value as AttributeValue,
			})
		}

		return this.#values.get(key)!.id
	}

	attributeNames() {
		const attrs: { ExpressionAttributeNames?: ExpressionAttributeNames } = {}

		if (this.#names.size > 0) {
			const names: ExpressionAttributeNames = {}

			for (const [name, id] of this.#names) {
				names[id] = name
			}

			attrs.ExpressionAttributeNames = names
		}

		return attrs
	}

	attributeValues() {
		const attrs: { ExpressionAttributeValues?: ExpressionAttributeValues } = {}

		if (this.#values.size > 0) {
			const values: ExpressionAttributeValues = {}
			for (const { id, value } of this.#values.values()) {
				values[id] = value
			}

			attrs.ExpressionAttributeValues = values
		}

		return attrs
	}

	attributes() {
		return {
			...this.attributeNames(),
			...this.attributeValues(),
		}
	}
}
