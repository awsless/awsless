import { URN } from './resource'

export class Node {
	private childs = new Set<Node>()
	private parental: Node | undefined

	constructor(readonly type: string, readonly identifier: string) {}

	get urn(): URN {
		return `${this.parental ? this.parental.urn : 'urn'}:${this.type}:{${this.identifier}}`
	}

	get parent() {
		return this.parental
	}

	get children() {
		return this.childs
	}

	add(...nodes: Node[]) {
		for (const node of nodes) {
			node.parental = this

			for (const child of this.childs) {
				if (child.urn === node.urn) {
					throw new Error(`Duplicate nodes detected: ${node.urn}`)
				}
			}

			this.childs.add(node)
		}
	}
}

export const flatten = (node: Node) => {
	const list: Node[] = [node]

	for (const child of node.children) {
		list.push(...flatten(child))
	}

	return list
}
