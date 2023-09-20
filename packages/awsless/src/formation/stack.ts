
import { Region } from "../schema/region";
import { App } from "./app";
import { Asset } from "./asset";
import { Group, Lazy, Resource } from "./resource";
import { ConstructorOf, formatLogicalId, formatName, importValue } from "./util";

export class Stack {
	private parent?:App

	readonly exports = new Map<string, string>()
	readonly resources = new Set<Resource>()
	readonly tags = new Map<string, string>()
	readonly assets = new Set<Asset>()

	constructor(readonly name: string, readonly region:Region) {}

	get app() {
		return this.parent
	}

	setApp(app: App) {
		this.parent = app

		return this
	}

	add(...resources: (Resource | Asset | Group)[]) {
		for(const item of resources) {
			if(item instanceof Asset) {
				this.assets.add(item)
			} else {
				this.add(...item.children)

				if(item instanceof Resource) {
					item.setStack(this)
					this.resources.add(item)
				}
			}
		}

		return this
	}

	export(name: string, value: string) {
		this.exports.set(formatName(name), value)
		return this
	}

	get(name: string) {
		name = formatName(name)

		if(!this.exports.has(name)) {
			throw new Error(`Undefined export value: ${name}`)
		}

		return this.exports.get(name)!
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

		const walk = (object:Record<string, any>) => {
			for(const [ key, value ] of Object.entries(object)) {
				if(!object.hasOwnProperty(key)) {
					continue
				}

				if(value instanceof Lazy) {
					object[key] = value.callback(this)
					continue
				}

				if(typeof value === 'object' && value !== null) {
					walk(value)
				}
			}
		}

		for(const resource of this.resources) {
			const json = resource.toJSON()
			walk(json)

			Object.assign(resources, json)
		}

		for(const [ name, value ] of this.exports.entries()) {
			Object.assign(outputs, {
				[ formatLogicalId(name) ]: {
					Export: {
						Name: `${ this.app?.name || 'default' }-${ name }`
					},
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
