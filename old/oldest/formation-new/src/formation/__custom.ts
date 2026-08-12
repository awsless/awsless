import { Group } from './group.ts'
import { createResourceMeta, Resource, ResourceConfig, ResourceMeta, State } from './resource.ts'

export class CustomResource implements Resource {
	readonly $: ResourceMeta

	constructor(provider: string, parent: Group, type: string, id: string, props: State, config?: ResourceConfig) {
		this.$ = createResourceMeta(provider, parent, type, id, props, config)
	}
}
