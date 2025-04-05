import { isResource } from './meta.ts'
import { type Resource, type URN } from './resource.ts'

// const getChildUrn = (child: Group | Resource | DataSource): URN => {
// 	if (child instanceof Group) {
// 		return child.urn
// 	}

// 	return child.$.urn
// }

export class Group {
	protected children: Array<Group | Resource> = []

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

	protected addChild(child: Group | Resource) {
		if (isResource(child)) {
			const duplicate = this.children
				.filter(c => isResource(c))
				.find(c => c.$.type === child.$.type && c.$.logicalId === child.$.logicalId)

			if (duplicate) {
				throw new Error(`Duplicate resource found: ${child.$.type}:${child.$.logicalId}`)
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

	add(...children: Array<Group | Resource>) {
		for (const child of children) {
			this.addChild(child)
		}
	}

	get resources(): Resource[] {
		return this.children
			.map(child => {
				if (child instanceof Group) {
					return child.resources
				}

				if (isResource(child)) {
					return child
				}

				return
			})
			.flat()
			.filter(child => !!child)
	}

	// get dataSources(): DataSource[] {
	// 	return this.children
	// 		.map(child => {
	// 			if (child instanceof Group) {
	// 				return child.dataSources
	// 			}

	// 			if (isDataSource(child)) {
	// 				return child
	// 			}

	// 			return
	// 		})
	// 		.flat()
	// 		.filter(child => !!child)
	// }
}
