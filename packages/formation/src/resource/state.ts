import { ResourceDocument } from './cloud'
import { URN } from './resource'

export interface StateProvider {
	lock(urn: URN): Promise<() => Promise<void>>
	// unlock(urn: URN): Promise<void>

	get(urn: URN): Promise<AppState>
	update(urn: URN, state: AppState): Promise<void>
	delete(urn: URN): Promise<void>
}

export type AppState = Record<URN, StackState>
export type StackState = Record<URN, ResourceState>
export type ResourceState = {
	id: string
	type: string
	provider: string
	local: ResourceDocument
	remote?: ResourceDocument
	assets: Record<string, string>
	dependencies: URN[]
	extra: Record<string, unknown>
	// dependents: string[]
}
