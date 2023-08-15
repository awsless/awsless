
import { Region } from "../schema/region";
import { Asset } from "./asset";
import { Group, Resource } from "./resource";
import { ConstructorOf, formatLogicalId, formatName, importValue } from "./util";

export class Stack {
	readonly exports = new Map<string, string>()
	readonly resources = new Set<Resource>()
	readonly tags = new Map<string, string>()
	readonly assets = new Set<Asset>()

	constructor(readonly name: string, readonly region:Region) {}

	add(...resources: (Resource | Asset | Group)[]) {
		for(const item of resources) {
			if(item instanceof Asset) {
				this.assets.add(item)
			} else {
				this.add(...item.children)

				if(item instanceof Resource) {
					this.resources.add(item)
				}
			}
		}

		return this
	}

	export(name: string, value: string) {
		name = formatName(name)

		this.exports.set(name, value)
		return this
	}

	import(name: string) {
		name = formatName(name)

		if(!this.exports.has(name)) {
			throw new Error(`Undefined export value: ${name}`)
		}

		return importValue(name)
	}

	tag(name: string, value: string) {
		this.tags.set(name, value)

		return this
	}

	find<T>(resourceType: ConstructorOf<T>): T[] {
		return [ ...this.resources ].filter(resource => resource instanceof resourceType) as T[]
	}

	[ Symbol.iterator ]() {
		return this.resources.values()
	}

	// get resources() {
	// 	return [ ...this.list.values() ]
	// }

	get size() {
		return this.resources.size
	}

	toJSON() {
		const resources = {}
		const outputs = {}

		for(const resource of this) {
			Object.assign(resources, resource.toJSON())
		}

		for(const [ name, value ] of this.exports.entries()) {
			Object.assign(outputs, {
				[ formatLogicalId(name) ]: {
					Export: { Name: name },
					Value: value,
				}
			})
		}

		return {
			Resources: resources,
			Outputs: outputs,
		}
	}

	toString(pretty:boolean = false) {
		return JSON.stringify(
			this.toJSON(),
			undefined,
			pretty ? 4 : undefined
		)
	}
}
