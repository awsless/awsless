import { Region } from '../config/schema/region.js'
import { App } from './app.js'
import { Asset } from './asset.js'
import { Group, Lazy, Resource } from './resource.js'
import { ConstructorOf, formatLogicalId, formatName, importValue, lazy } from './util.js'

export class Stack {
	private parent?: App

	readonly exports = new Map<string, string>()
	readonly resources = new Set<Resource>()
	readonly tags = new Map<string, string>()
	readonly assets = new Set<Asset>()

	constructor(readonly name: string, readonly region: Region) {}

	get app() {
		return this.parent
	}

	setApp(app: App) {
		this.parent = app

		return this
	}

	add(...resources: (Resource | Asset | Group)[]) {
		for (const item of resources) {
			if (item instanceof Asset) {
				this.assets.add(item)
			} else {
				this.add(...item.children)

				if (item instanceof Resource) {
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

		if (!this.exports.has(name)) {
			throw new Error(`Undefined export value: ${name}`)
		}

		return this.exports.get(name)!
	}

	import(name: string) {
		name = formatName(name)

		if (!this.exports.has(name)) {
			throw new Error(`Undefined export value: ${name}`)
		}

		return lazy(stack => {
			if (stack === this) {
				return this.exports.get(name)!
			}

			return importValue(`${stack.app?.name ?? 'default'}-${name}`)
		})
	}

	tag(name: string, value: string) {
		this.tags.set(name, value)

		return this
	}

	find<T>(resourceType: ConstructorOf<T>): T[] {
		return [...this.resources].filter(resource => resource instanceof resourceType) as T[]
	}

	findByLogicalId<T = Resource>(id: string): T | undefined {
		return [...this.resources].find(resource => resource.logicalId === id) as T | undefined
	}

	[Symbol.iterator]() {
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

		const walk = (node: unknown | Lazy): unknown => {
			if (node instanceof Lazy) {
				return walk(node.callback(this))
			}

			if (Array.isArray(node)) {
				return node.map(walk)
			}

			if (typeof node === 'object' && node !== null) {
				const object: Record<string, unknown> = {}

				for (const [key, value] of Object.entries(node)) {
					object[key] = walk(value)
				}

				return object
			}

			return node
		}

		for (const resource of this.resources) {
			const json = walk(resource.toJSON())
			Object.assign(resources, json)
		}

		for (let [name, value] of this.exports.entries()) {
			Object.assign(outputs, {
				[formatLogicalId(name)]: {
					Export: {
						Name: `${this.app?.name ?? 'default'}-${name}`,
					},
					Value: walk(value),
				},
			})
		}

		return {
			Resources: resources,
			Outputs: outputs,
		}
	}

	toString(pretty: boolean = false) {
		return JSON.stringify(this.toJSON(), undefined, pretty ? 4 : undefined)
	}
}
