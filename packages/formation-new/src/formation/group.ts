import { DataSource } from './data-source.ts'
import { isDataSource, isNode, isResource, type Node } from './node.ts'
import { Resource } from './resource.ts'
import { URN } from './urn.ts'

// const getChildUrn = (child: Group | Resource | DataSource): URN => {
// 	if (child instanceof Group) {
// 		return child.urn
// 	}

// 	return child.$.urn
// }

export class Group {
	protected children: Array<Group | Node> = []

	constructor(
		readonly parent: Group | undefined,
		readonly type: string,
		readonly name: string
	) {
		parent?.children.push(this)
	}

	get urn(): URN {
		const urn = this.parent ? this.parent.urn : 'urn'
		return `${urn}:${this.type}:{${this.name}}`
	}

	protected addChild(child: Group | Node) {
		if (isNode(child)) {
			const duplicate = this.children
				.filter(c => isResource(c))
				.find(c => c.$.type === child.$.type && c.$.logicalId === child.$.logicalId)

			if (duplicate) {
				throw new Error(`Duplicate node found: ${child.$.type}:${child.$.logicalId}`)
			}
		}

		if (child instanceof Group) {
			const duplicate = this.children
				.filter(c => c instanceof Group)
				.find(c => c.type === child.type && c.name === child.name)

			if (duplicate) {
				throw new Error(`Duplicate group found: ${child.type}:${child.name}`)
			}
		}

		this.children.push(child)
	}

	add(...children: Array<Group | Node>) {
		for (const child of children) {
			this.addChild(child)
		}
	}

	get nodes(): Node[] {
		return this.children
			.map(child => {
				if (child instanceof Group) {
					return child.nodes
				}

				if (isNode(child)) {
					return child
				}

				return
			})
			.flat()
			.filter(child => !!child)
	}

	get resources(): Resource[] {
		return this.nodes.filter(node => isResource(node))
	}

	get dataSources(): DataSource[] {
		return this.nodes.filter(node => isDataSource(node))
	}
}
