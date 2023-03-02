import { AttributeValue } from "@aws-sdk/client-dynamodb"
import { AnyTableDefinition } from "../table"
import { InferPath } from "../types/infer"

type ExpressionAttributeNames = Record<string, string>
type ExpressionAttributeValues = Record<string, AttributeValue>

export class IDGenerator<T extends AnyTableDefinition> {
	private cacheN = new Map<string, number>()
	private countN = 0

	private cacheV = new Map<AttributeValue, { path:InferPath<T> | undefined, id: number }>()
	private countV = 0

	constructor(private table:T) {}

	path(key:string | Array<string | number>) {
		if(Array.isArray(key)) {
			return key.map((name, index) => {
				if(typeof name === 'string') {
					return `${ index === 0 ? '' : '.' }${ this.name(name) }`
				}

				return `[${name}]`
			}).join('')
		}

		return this.name(key)
	}

	name(key:string) {
		if(!this.cacheN.has(key)) {
			this.cacheN.set(key, ++this.countN)
		}

		return `#n${this.cacheN.get(key)}`
	}

	value<P extends InferPath<T>>(value:AttributeValue, path?:P) {
		if(!this.cacheV.has(value)) {
			this.cacheV.set(value, { path, id: ++this.countV })
		}

		return `:v${this.cacheV.get(value)!.id}`
	}

	attributeNames() {
		const attrs:{ ExpressionAttributeNames?: ExpressionAttributeNames } = {}

		if(this.cacheN.size > 0) {
			const names:ExpressionAttributeNames = {}
			for(const [ key, id ] of this.cacheN) {
				names[`#n${id}`] = key
			}

			attrs.ExpressionAttributeNames = names
		}

		return attrs
	}

	attributeValues() {
		const attrs:{ ExpressionAttributeValues?: ExpressionAttributeValues } = {}

		if(this.cacheV.size > 0) {
			const values:ExpressionAttributeValues = {}
			for(const [ value, { path, id } ] of this.cacheV) {
				values[`:v${id}`] = (path ? this.table.schema.walk?.(...path)?.marshall(value) : value) as AttributeValue
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
