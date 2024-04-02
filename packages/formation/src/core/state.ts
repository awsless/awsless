import { ResourceDocument } from './cloud'
import { ResourceDeletionPolicy, URN } from './resource'

export interface StateProvider {
	lock(urn: URN): Promise<() => Promise<void>>
	// unlock(urn: URN): Promise<void>

	get(urn: URN): Promise<AppState>
	update(urn: URN, state: AppState): Promise<void>
	delete(urn: URN): Promise<void>
}

// export type AppState = {
// 	shared?: Record<string, unknown>
// 	stacks?: Record<URN, StackState>
// }

export type AppState = Record<URN, StackState>

export type StackState = {
	name: string
	exports: Record<URN, unknown>
	resources: Record<URN, ResourceState>
}

export type ResourceState = {
	id: string
	type: string
	provider: string
	local: ResourceDocument
	remote?: ResourceDocument
	assets: Record<string, string>
	dependencies: URN[]
	extra: Record<string, unknown>
	policies: {
		deletion: ResourceDeletionPolicy
	}
	// dependents: string[]
}
