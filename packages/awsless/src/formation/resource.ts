import { Asset } from "./asset"
import { formatLogicalId } from "./util"

export type Permission = {
	effect?: 'Allow' | 'Deny'
	actions: string[]
	resources: string[]
}

export interface Resource {
	readonly permissions?: Permission | Permission[]
}

export abstract class Resource {
	readonly logicalId: string
	private deps = new Set<Resource>()

	constructor(
		readonly type: string,
		logicalId: string,
		readonly children: Array<Resource | Asset> = []
	) {
		this.logicalId = formatLogicalId(`${ logicalId }-${ type.replace(/^AWS::/, '') }`)
	}

	dependsOn(...dependencies: Resource[]) {
		for(const dependency of dependencies) {
			this.deps.add(dependency)
		}

		return this
	}

	protected attr(name:string, value:unknown) {
		if(typeof value === 'undefined') {
			return {}
		}

		return {
			[name]: value
		}
	}

	toJSON() {
		return {
			[ this.logicalId ]: {
				Type: this.type,
				DependsOn: [ ...this.deps ].map(dep => dep.logicalId),
				Properties: this.properties()
			}
		}
	}

	abstract properties(): object
}

export class Group {
	constructor(readonly children:Array<Resource | Asset>) {}
}
