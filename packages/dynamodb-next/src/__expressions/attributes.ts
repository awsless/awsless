import { AttributeValue } from '@aws-sdk/client-dynamodb'

export type ExpressionAttributeNames = Record<string, string>
export type ExpressionAttributeValues = Record<string, AttributeValue>

export class ExpressionAttributes {
	#names = new Map<string, string>()
	#values = new Map<unknown, { id: string; value: AttributeValue }>()

	constructor(
		private table: {
			walk(...path: string[]): {
				marshall(value: any): any
			}
		}
	) {}

	path(path: string | string[]): string {
		if (typeof path === 'string') {
			return this.name(path)
		}

		return path
			.map((name, index) => {
				if (name !== '' && !isNaN(name as any)) {
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

	value(value: any, path: string | string[]): string {
		const marshalled = this.table.walk(...path).marshall(value)
		return this.raw(marshalled)
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
