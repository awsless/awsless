import { ResolvedAsset } from './asset'
import { URN } from './resource'

export type ResourceDocument = Record<string, unknown>
export type ResourceExtra = Record<string, unknown>

export type CreateProps<D = ResourceDocument, E = ResourceExtra> = {
	urn: URN
	type: string
	document: D
	extra: E
	assets: Record<string, ResolvedAsset>
	token: string
}

export type UpdateProps<D = ResourceDocument, E = ResourceExtra> = {
	urn: URN
	id: string
	type: string
	oldDocument: D
	newDocument: D
	remoteDocument: any
	extra: E
	assets: Record<string, ResolvedAsset>
	token: string
}

export type DeleteProps<D = ResourceDocument, E = ResourceExtra> = {
	urn: URN
	id: string
	type: string
	document: D
	extra: E
	assets: Record<string, string>
	token: string
}

export type GetProps<D = ResourceDocument, E = ResourceExtra> = {
	urn: URN
	id: string
	type: string
	document: D
	extra: E
}

export interface CloudProvider {
	// own(resource: Resource): boolean
	// own(resource: Node): resource is Node
	own(id: string): boolean

	get(props: GetProps): Promise<any>

	create(props: CreateProps): Promise<string>
	update(props: UpdateProps): Promise<string>
	delete(props: DeleteProps): Promise<void>
}
