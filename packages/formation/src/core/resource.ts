// import { Asset } from './asset.js'
// import { Stack } from './stack.js'
// import { formatLogicalId, getAtt, ref } from './util.js'

// import { CloudProvider } from '../cloud-provider'
import { Asset } from './asset'
import { ResourceDocument } from './cloud'
import { Node } from './node'
import { Input, Output, Unwrap, findResources, unwrap } from './output'

export type URN = `urn:${string}`

// export interface Resource {
// 	toData?(): unknown
// 	toData?(): unknown
// }

export type ResourceDeletionPolicy = 'retain' | 'before-deployment' | 'after-deployment'

export type ResourcePolicies = {
	deletionPolicy?: ResourceDeletionPolicy
	// updatePolicy: 'retain' | 'before-deployment' | 'after-deployment'
}

export abstract class Resource extends Node {
	private remoteDocument: any | undefined
	private listeners = new Set<(remoteDocument: any) => void>()

	readonly dependencies = new Set<Resource>()

	constructor(
		readonly type: string,
		readonly identifier: string,
		inputs?: unknown
		// private resourcePolicies: ResourcePolicies = {}
	) {
		super(type, identifier)

		if (inputs) {
			this.registerDependency(inputs)
		}
	}

	abstract cloudProviderId: string

	deletionPolicy: ResourceDeletionPolicy = 'before-deployment'

	abstract toState(): {
		extra?: Record<string, unknown>
		assets?: Record<string, Input<Asset>>
		document?: ResourceDocument
	}

	// set deletionPolicy(policy: ResourceDeletionPolicy) {
	// 	this.resourcePolicies?.deletionPolicy policy
	// }

	// get deletionPolicy() {
	// 	return this.resourcePolicies?.deletionPolicy ?? 'before-deployment'
	// }

	dependsOn(...resources: Resource[]) {
		for (const resource of resources) {
			this.dependencies.add(resource)
		}

		return this
	}

	protected registerDependency(props: unknown) {
		this.dependsOn(...findResources(props))

		// if (props instanceof Output) {
		// 	if (props.resources) {
		// 		this.dependsOn(...props.resources)
		// 	}
		// } else if (props instanceof Resource) {
		// 	this.dependsOn(props)
		// } else if (Array.isArray(props)) {
		// 	props.map(p => this.registerDependency(p))
		// } else if (props?.constructor === Object) {
		// 	Object.values(props).map(p => this.registerDependency(p))
		// }
	}

	setRemoteDocument(remoteDocument: any) {
		for (const listener of this.listeners) {
			listener(remoteDocument)
		}

		this.listeners.clear()
		this.remoteDocument = remoteDocument
	}

	output<T = string>(getter: (remoteDocument: any) => T) {
		return new Output<T>([this], resolve => {
			if (this.remoteDocument) {
				resolve(getter(this.remoteDocument))
			} else {
				this.listeners.add(remoteDocument => {
					resolve(getter(remoteDocument))
				})
			}
		})
	}

	protected attr<T extends Input<unknown>>(
		name: string,
		input: T,
		transform?: (value: Exclude<Unwrap<T>, undefined>) => unknown
	) {
		const value = unwrap(input)

		if (typeof value === 'undefined') {
			return {}
		}

		const definedValue = value as Exclude<Unwrap<T>, undefined>

		return {
			[name]: transform ? transform(definedValue) : definedValue,
		}
	}
}
