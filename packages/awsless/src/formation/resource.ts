import { Asset } from "./asset"
import { Stack } from "./stack"
import { formatLogicalId, getAtt, ref } from "./util"

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
	readonly tags = new Map<string, string>()
	protected deps = new Set<Resource>()
	protected stack: Stack | undefined

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

	tag(key: string, value: string) {
		this.tags.set(key, value)

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

	setStack(stack:Stack) {
		this.stack = stack

		return this
	}

	protected ref() {
		return this.getAtt('ref')
	}

	protected getAtt<T = string>(attr:string) {
		return new Lazy((stack) => {
			if(!this.stack) {
				throw new TypeError('Resource stack not defined before building template')
			}

			const value = attr === 'ref' ? ref<T>(this.logicalId) : getAtt<T>(this.logicalId, attr)

			if(stack === this.stack) {
				return value
			}

			const name = `${this.stack.name}-${this.logicalId}-${attr}`
			this.stack.export(name, value as string)

			return this.stack.import(name)
		}) as unknown as T
	}

	toJSON() {
		return {
			[ this.logicalId ]: {
				Type: this.type,
				DependsOn: [ ...this.deps ].map(dep => dep.logicalId),
				Properties: {
					...(this.tags.size ? {
						Tags: Array.from(this.tags.entries()).map(([ key, value ]) => ({
							Key: key,
							Value: value,
						}))
					 } : {}),
					...this.properties(),
				}
			}
		}
	}

	abstract properties(): object
}

export class Group {
	constructor(readonly children:Array<Resource | Asset>) {}
}

export class Lazy {
	constructor(readonly callback:(stack:Stack) => unknown) {}
}
