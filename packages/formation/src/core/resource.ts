// import { Asset } from './asset.js'
// import { Stack } from './stack.js'
// import { formatLogicalId, getAtt, ref } from './util.js'

// import { CloudProvider } from '../cloud-provider'
import { Asset } from './asset'
import { ResourceDocument } from './cloud'
import { Node } from './node'
import { findResources, Input, Output, Unwrap, unwrap } from './output'
import { Stack } from './stack'

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
		readonly parent: Node,
		readonly type: string,
		readonly identifier: string,
		inputs?: unknown
		// private resourcePolicies: ResourcePolicies = {}
	) {
		super(parent, type, identifier)

		if (inputs) {
			this.registerDependency(inputs)
		}

		if (
			typeof inputs === 'object' &&
			inputs !== null &&
			'tags' in inputs &&
			typeof inputs.tags === 'object' &&
			inputs.tags !== null
		) {
			this.setTag(inputs.tags as Record<string, Input<string>>)
		}
	}

	abstract cloudProviderId: string

	deletionPolicy: ResourceDeletionPolicy = 'before-deployment'

	abstract toState(): {
		extra?: Record<string, unknown>
		assets?: Record<string, Input<Asset> | undefined>
		document?: ResourceDocument
	}

	get stack(): Stack {
		let current: Node | undefined = this

		while (current) {
			const parent: Node | undefined = current.parent

			if (parent instanceof Stack) {
				return parent
			}

			current = parent
		}

		// if (this.parent instanceof Stack) {
		// 	return this.parent
		// }

		// if (this.parent instanceof Resource) {
		// 	return this.parent.stack
		// }

		throw new Error(`Resource stack can't be found`)
	}

	// set deletionPolicy(policy: ResourceDeletionPolicy) {
	// 	this.resourcePolicies?.deletionPolicy policy
	// }

	// get deletionPolicy() {
	// 	return this.resourcePolicies?.deletionPolicy ?? 'before-deployment'
	// }

	dependsOn(...resources: Resource[]) {
		for (const resource of resources) {
			if (resource.stack === this.stack) {
				this.dependencies.add(resource)
			} else {
				this.stack.dependsOn(resource.stack)
			}
		}

		return this
	}

	protected registerDependency(props: unknown) {
		this.dependsOn(...findResources(props))

		// const resources = findResources(props)

		// for (const resource of resources) {
		// 	if (resource.stack !== this.stack) {
		// 		this.stack.dependsOn(resource.stack)
		// 	} else {
		// 		this.dependsOn(resource)
		// 	}
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
