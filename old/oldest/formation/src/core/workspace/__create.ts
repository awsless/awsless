import { CloudProvider } from '../cloud'
import { ResourceError } from '../error'
import { Resource } from '../resource'
import { AppState, ResourceState, StackState } from '../state'
import { loadAssets, resolveDocumentAssets } from './asset'
import { unwrapOutputsFromDocument } from './document'
import { getCloudProvider } from './provider'
import { createIdempotantToken } from './token'

export const createResource = async (
	cloudProviders: CloudProvider[],
	appState: AppState,
	stackState: StackState,
	resource: Resource
): Promise<ResourceState> => {
	const provider = getCloudProvider(cloudProviders, resource.cloudProviderId)
	const state = resource.toState()
	const [assets, assetHashes] = await loadAssets(state.assets ?? {})
	const document = unwrapOutputsFromDocument(resource.urn, state.document ?? {})
	const extra = unwrapOutputsFromDocument(resource.urn, state.extra ?? {})

	const token = createIdempotantToken(appState.token!, resource.urn, 'create')

	let id: string
	try {
		id = await provider.create({
			urn: resource.urn,
			type: resource.type,
			document: resolveDocumentAssets(document, assets),
			assets,
			extra,
			token,
		})
	} catch (error) {
		throw ResourceError.wrap(resource.urn, resource.type, 'create', error)
	}

	return (stackState.resources[resource.urn] = {
		id,
		type: resource.type,
		provider: resource.cloudProviderId,
		local: document,
		assets: assetHashes,
		dependencies: [...resource.dependencies].map(d => d.urn),
		extra,
		policies: {
			deletion: resource.deletionPolicy,
		},
	})
}

// private async createResource(props: {
// 	stackState: StackState
// 	provider: CloudProvider
// 	resource: Resource
// 	assets: Record<string, ResolvedAsset>
// 	extra: ResourceDocument
// }) {

// 	try {
// 		const id = await props.provider.create({
// 			urn: props.resource.urn,
// 			type: props.resource.type,
// 			document: this.resolveDocumentAssets(this.copy(props.document), props.assets),
// 			assets: props.assets,
// 			extra: props.extra,
// 		})

// 		return id
// 	} catch (error) {
// 		throw ResourceError.wrap(
// 			//
// 			props.resource.urn,
// 			props.resource.type,
// 			'create',
// 			error
// 		)
// 	}

resourceState = stackState.resources[resource.urn] = {
	id,
	type: resource.type,
	provider: resource.cloudProviderId,
	local: document,
	assets: assetHashes,
	dependencies: [...resource.dependencies].map(d => d.urn),
	extra,
	policies: {
		deletion: resource.deletionPolicy,
	},
	// deletionPolicy: unwrap(state.deletionPolicy),
}
// }
