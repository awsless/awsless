import { AnyTable } from '../table'
import { AttributeValue } from '../types/value'

type ExpressionAttributeNames = Record<string, string>
type ExpressionAttributeValues = Record<string, AttributeValue>

export class IDGenerator<T extends AnyTable> {
	private cacheN = new Map<string, number>()
	private countN = 0

	private cacheV: { path: string | Array<string | number> | undefined; id: number; value: AttributeValue }[] = []
	private countV = 0

	constructor(private table: T) {}

	path(key: string | Array<string | number>) {
		if (Array.isArray(key)) {
			return key
				.map((name, index) => {
					if (typeof name === 'string') {
						return `${index === 0 ? '' : '.'}${this.name(name)}`
					}

					return `[${name}]`
				})
				.join('')
		}

		return this.name(key)
	}

	name(key: string) {
		if (!this.cacheN.has(key)) {
			this.cacheN.set(key, ++this.countN)
		}

		return `#n${this.cacheN.get(key)}`
	}

	value(value: AttributeValue, path?: string | Array<string | number>) {
		const id = ++this.countV
		this.cacheV.push({ path, value, id })

		return `:v${id}`
	}

	attributeNames() {
		const attrs: { ExpressionAttributeNames?: ExpressionAttributeNames } = {}

		if (this.cacheN.size > 0) {
			const names: ExpressionAttributeNames = {}
			for (const [name, id] of this.cacheN) {
				names[`#n${id}`] = name
			}

			attrs.ExpressionAttributeNames = names
		}

		return attrs
	}

	attributeValues() {
		const attrs: { ExpressionAttributeValues?: ExpressionAttributeValues } = {}

		if (this.cacheV.length > 0) {
			const values: ExpressionAttributeValues = {}
			for (const { path, id, value } of this.cacheV) {
				values[`:v${id}`] = path ? this.table.schema.walk?.(...path)?.marshall(value) : value
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
