import { URN } from './resource'

export class Node {
	readonly children: Node[] = []
	// private parent: Node

	constructor(readonly parent: Node | undefined, readonly type: string, readonly identifier: string) {
		parent?.children.push(this)
	}

	get urn(): URN {
		return `${this.parent ? this.parent.urn : 'urn'}:${this.type}:{${this.identifier}}`
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
