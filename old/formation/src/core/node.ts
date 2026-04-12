import { Input } from './output'
import { URN } from './resource'

export class Node {
	readonly children: Node[] = []
	readonly localTags: Record<string, Input<string>> = {}
	// private parent: Node

	constructor(
		readonly parent: Node | undefined,
		readonly type: string,
		readonly identifier: string
	) {
		parent?.children.push(this)
	}

	get urn(): URN {
		return `${this.parent ? this.parent.urn : 'urn'}:${this.type}:{${this.identifier}}`
	}

	get tags(): Record<string, Input<string>> {
		return {
			...(this.parent?.tags ?? {}),
			...this.localTags,
		}
	}

	// setTags(tags: Record<string, string>) {
	// 	this.localTags[name] = value

	// 	return this
	// }

	setTag(name: string, value: Input<string>): this
	setTag(tags: Record<string, Input<string>>): this
	setTag(name: string | Record<string, Input<string>>, value?: Input<string>) {
		if (typeof name === 'string') {
			this.localTags[name] = value!
		} else {
			Object.assign(this.localTags, name)
		}

		return this
	}

	getTag(name: string) {
		return this.localTags[name]
	}

	removeTag(name: string) {
		delete this.localTags[name]
	}

	// get parent() {
	// 	return this.parental
	// }

	// get children() {
	// 	return this.childs
	// }

	// add(...nodes: Node[]) {
	// 	for (const node of nodes) {
	// 		if (node.parental) {
	// 			throw new Error(`Node already has a parent: ${node.urn}`)
	// 		}

	// 		node.parental = this

	// 		for (const child of this.childs) {
	// 			if (child.urn === node.urn) {
	// 				throw new Error(`Duplicate nodes detected: ${node.urn}`)
	// 			}
	// 		}

	// 		this.childs.add(node)
	// 	}
	// }
}

export const flatten = (node: Node) => {
	const list: Node[] = [node]

	for (const child of node.children) {
		list.push(...flatten(child))
	}

	return list
}
