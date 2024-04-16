import { CloudProvider, ResourceDocument } from '../cloud'
import { Resource, URN } from '../resource'
import { Stack } from '../stack'
import { AppState, ResourceState, StackState, StateProvider } from '../state'
import { Step, run } from 'promise-dag'
import { ResourceError, ResourceNotFound, StackError } from '../error'
import { App } from '../app'
import { ExportedData } from '../export'
import { lockApp } from './lock'
import { cloneObject, compareDocuments, unwrapOutputsFromDocument } from './document'
import { loadAssets, resolveDocumentAssets } from './asset'
import { createIdempotantToken } from './token'
import { getCloudProvider } from './provider'
import { randomUUID } from 'crypto'

export type ResourceOperation = 'create' | 'update' | 'delete' | 'heal' | 'get'
export type StackOperation = 'deploy' | 'delete'

export class WorkSpace {
	constructor(
		protected props: {
			cloudProviders: CloudProvider[]
			stateProvider: StateProvider
		}
	) {}

	private getExportedData(appState: AppState) {
		const data: ExportedData = {}

		for (const stackData of Object.values(appState.stacks)) {
			data[stackData.name] = stackData.exports
		}

		return data
	}

	// async deployApp(app: App) {
	// 	return this.lockedOperation(app.urn, async () => {
	// 		const appState = await this.props.stateProvider.get(app.urn)

	// 		for (const stack of app.stacks) {
	// 			await this.deployStack(stack)
	// 		}

	// 		console.log(appState)

	// 		// for (const [urn, stackState] of appState) {
	// 		// 	stackState
	// 		// }
	// 	})
	// }

	// async diffStack(stack: Stack) {
	// 	const app = stack.parent

	// 	if (!app || !(app instanceof App)) {
	// 		throw new StackError([], 'Stack must belong to an App')
	// 	}

	// 	const appState = await this.props.stateProvider.get(app.urn)

	// 	const stackState = (appState[stack.urn] = appState[stack.urn] ?? {
	// 		name: stack.name,
	// 		exports: {},
	// 		resources: {},
	// 	})

	// 	const resources = stack.resources

	// 	const creates: URN[] = []
	// 	const updates: URN[] = []
	// 	const deletes: URN[] = []

	// 	for (const resource of resources) {
	// 		const resourceState = stackState.resources[resource.urn]

	// 		if (resourceState) {
	// 			resource.setRemoteDocument(resourceState.remote)
	// 		}
	// 	}

	// 	for (const urn of Object.keys(stackState.resources)) {
	// 		const resource = resources.find(r => r.urn === urn)

	// 		if (!resource) {
	// 			deletes.push(urn as URN)
	// 		}
	// 	}

	// 	for (const resource of resources) {
	// 		const resourceState = stackState.resources[resource.urn]

	// 		if (resourceState) {
	// 			const state = resource.toState()
	// 			const [_, assetHashes] = await this.resolveAssets(state.assets ?? {})
	// 			const document = this.unwrapDocument(resource.urn, state.document ?? {}, false)

	// 			if (
	// 				!this.compare(
	// 					//
	// 					[resourceState.local, resourceState.assets],
	// 					[document, assetHashes]
	// 				)
	// 			) {
	// 				// console.log('S', JSON.stringify(resourceState.local))
	// 				// console.log('D', JSON.stringify(document))

	// 				updates.push(resource.urn)
	// 			}
	// 		} else {
	// 			creates.push(resource.urn)
	// 		}
	// 	}

	// 	return {
	// 		creates,
	// 		updates,
	// 		deletes,
	// 	}
	// }

	async deployStack(stack: Stack) {
		const app = stack.parent

		if (!app || !(app instanceof App)) {
			throw new StackError([], 'Stack must belong to an App')
		}

		return lockApp(this.props.stateProvider, app.urn, async () => {
			const appState: AppState = (await this.props.stateProvider.get(app.urn)) ?? {
				name: app.name,
				stacks: {},
			}

			// -------------------------------------------------------
			// Set the idempotent token when no token exists.

			if (!appState.token) {
				appState.token = randomUUID()

				await this.props.stateProvider.update(app.urn, appState)
			}

			// -------------------------------------------------------

			const stackState: StackState = (appState.stacks[stack.urn] = appState.stacks[stack.urn] ?? {
				name: stack.name,
				exports: {},
				resources: {},
			})

			const resources = stack.resources

			// -------------------------------------------------------------------
			// Set the exported data on the app.

			app.setExportedData(this.getExportedData(appState))

			// -------------------------------------------------------------------
			// Find Deletable resources...

			const deleteResourcesBefore: Record<URN, ResourceState> = {}
			const deleteResourcesAfter: Record<URN, ResourceState> = {}

			for (const [urnStr, state] of Object.entries(stackState.resources)) {
				const urn = urnStr as URN
				const resource = resources.find(r => r.urn === urn)

				if (!resource) {
					if (state.policies.deletion === 'before-deployment') {
						deleteResourcesBefore[urn] = state
					}

					if (state.policies.deletion === 'after-deployment') {
						deleteResourcesAfter[urn] = state
					}
				}
			}

			// -------------------------------------------------------------------
			// Process resources...

			try {
				// -------------------------------------------------------------------
				// Delete resources before deployment...

				if (Object.keys(deleteResourcesBefore).length > 0) {
					await this.deleteStackResources(app.urn, appState, stackState, deleteResourcesBefore)
				}

				// -------------------------------------------------------------------
				// Deploy resources...

				await this.deployStackResources(app.urn, appState, stackState, resources)

				// -------------------------------------------------------------------
				// Delete resources after deployment...

				if (Object.keys(deleteResourcesAfter).length > 0) {
					await this.deleteStackResources(app.urn, appState, stackState, deleteResourcesAfter)
				}

				// -------------------------------------------------------------------
			} catch (error) {
				// const resourceError = new ResourceError()

				throw error
			}

			// -------------------------------------------------------------------
			// Delete the idempotant token when the deployment reaches the end.

			delete appState.token

			// -------------------------------------------------------------------
			// Save stack exports

			stackState.exports = unwrapOutputsFromDocument(stack.urn, stack.exported)

			await this.props.stateProvider.update(app.urn, appState)

			// -------------------------------------------------------------------

			return stackState
		})
	}

	async deleteStack(stack: Stack) {
		const app = stack.parent

		if (!app || !(app instanceof App)) {
			throw new StackError([], 'Stack must belong to an App')
		}

		return lockApp(this.props.stateProvider, app.urn, async () => {
			const appState: AppState = (await this.props.stateProvider.get(app.urn)) ?? {
				name: app.name,
				stacks: {},
			}

			// -------------------------------------------------------
			// Set the idempotent token when no token exists.

			if (!appState.token) {
				appState.token = randomUUID()

				await this.props.stateProvider.update(app.urn, appState)
			}

			// -------------------------------------------------------

			const stackState = appState.stacks[stack.urn]

			if (!stackState) {
				throw new StackError([], `Stack already deleted: ${stack.name}`)
			}

			try {
				await this.deleteStackResources(app.urn, appState, stackState, stackState.resources)
			} catch (error) {
				throw error
			}

			delete appState.token
			delete appState.stacks[stack.urn]

			await this.props.stateProvider.update(app.urn, appState)
		})
	}

	private async getRemoteResource(props: {
		urn: URN
		type: string
		id: string
		document: ResourceDocument
		extra: ResourceDocument
		provider: CloudProvider
	}) {
		let remote: any
		try {
			remote = await props.provider.get(props)
		} catch (error) {
			throw ResourceError.wrap(props.urn, props.type, 'get', error)
		}

		return remote
	}

	private async deployStackResources(
		appUrn: URN,
		appState: AppState,
		stackState: StackState,
		resources: Resource[]
	) {
		// -------------------------------------------------------------------
		// Heal from unknown remote state

		await this.healFromUnknownRemoteState(stackState)

		// -------------------------------------------------------------------
		// Deploy resources...

		const deployGraph: Record<URN, Step[]> = {}

		for (const resource of resources) {
			const provider = getCloudProvider(this.props.cloudProviders, resource.cloudProviderId)

			deployGraph[resource.urn] = [
				...[...resource.dependencies].map(dep => dep.urn),
				async () => {
					const state = resource.toState()
					const [assets, assetHashes] = await loadAssets(state.assets ?? {})
					const document = unwrapOutputsFromDocument(resource.urn, state.document ?? {})
					const extra = unwrapOutputsFromDocument(resource.urn, state.extra ?? {})

					let resourceState = stackState.resources[resource.urn]

					if (!resourceState) {
						const token = createIdempotantToken(appState.token!, resource.urn, 'create')

						let id: string
						try {
							id = await provider.create({
								urn: resource.urn,
								type: resource.type,
								document: resolveDocumentAssets(cloneObject(document), assets),
								assets,
								extra,
								token,
							})
						} catch (error) {
							throw ResourceError.wrap(resource.urn, resource.type, 'create', error)
						}

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
						}

						const remote = await this.getRemoteResource({
							id,
							urn: resource.urn,
							type: resource.type,
							document,
							extra,
							provider,
						})

						resourceState.remote = remote
					} else if (
						// Check if any state has changed
						!compareDocuments(
							//
							[resourceState.local, resourceState.assets],
							[document, assetHashes]
						)
					) {
						// this.resolveDocumentAssets(this.copy(document), assets),
						const token = createIdempotantToken(appState.token!, resource.urn, 'update')

						let id: string
						try {
							id = await provider.update({
								urn: resource.urn,
								id: resourceState.id,
								type: resource.type,
								remoteDocument: resolveDocumentAssets(cloneObject(resourceState.remote), assets),
								oldDocument: resolveDocumentAssets(cloneObject(resourceState.local), assets),
								newDocument: document,
								assets,
								extra,
								token,
							})
						} catch (error) {
							throw ResourceError.wrap(resource.urn, resource.type, 'update', error)
						}

						resourceState.id = id
						resourceState.local = document
						resourceState.assets = assetHashes

						// This command might fail.
						// We will need to heal the state if this fails.

						const remote = await this.getRemoteResource({
							id,
							urn: resource.urn,
							type: resource.type,
							document,
							extra,
							provider,
						})

						resourceState.remote = remote
					}

					resourceState.extra = extra
					resourceState.dependencies = [...resource.dependencies].map(d => d.urn)
					resourceState.policies.deletion = resource.deletionPolicy

					resource.setRemoteDocument(resourceState.remote)
				},
			]
		}

		const results = await Promise.allSettled(Object.values(run(deployGraph)))

		await this.props.stateProvider.update(appUrn, appState)

		// for (const result of results) {
		// 	if (result.status === 'rejected') {
		// 		throw result.reason
		// 	}
		// }

		const errors: ResourceError[] = results
			.filter(r => r.status === 'rejected')
			.map(r => (r as PromiseRejectedResult).reason)

		if (errors.length > 0) {
			throw new StackError(errors, 'Deploying resources failed.')
		}
	}

	private dependentsOn(resources: Record<URN, ResourceState>, dependency: URN) {
		const dependents: URN[] = []

		for (const [urn, resource] of Object.entries(resources)) {
			if (resource.dependencies.includes(dependency)) {
				dependents.push(urn as URN)
			}
		}

		return dependents
	}

	private async deleteStackResources(
		appUrn: URN,
		appState: AppState,
		stackState: StackState,
		resources: Record<URN, ResourceState>
	) {
		// -------------------------------------------------------------------
		// Delete resources...

		const deleteGraph: Record<string, Step[]> = {}

		for (const [urnStr, state] of Object.entries(resources)) {
			const urn = urnStr as URN
			const provider = getCloudProvider(this.props.cloudProviders, state.provider)
			const token = createIdempotantToken(appState.token!, urn, 'delete')

			deleteGraph[urn] = [
				...this.dependentsOn(resources, urn),
				async () => {
					try {
						await provider.delete({
							urn,
							id: state.id,
							type: state.type,
							document: state.local,
							assets: state.assets,
							extra: state.extra,
							token,
						})
					} catch (error) {
						if (error instanceof ResourceNotFound) {
							// The resource has already been deleted.
							// Let's skip this issue.
						} else {
							throw ResourceError.wrap(urn, state.type, 'delete', error)
						}
					}

					// -------------------------------------------------------------------
					// Delete the resource from the stack state

					delete stackState.resources[urn]
				},
			]
		}

		const results = await Promise.allSettled(Object.values(run(deleteGraph)))

		// -------------------------------------------------------------------
		// Save changed AppState

		await this.props.stateProvider.update(appUrn, appState)

		const errors: ResourceError[] = results
			.filter(r => r.status === 'rejected')
			.map(r => (r as PromiseRejectedResult).reason)

		if (errors.length > 0) {
			throw new StackError(errors, 'Deleting resources failed.')
		}
	}

	private async healFromUnknownRemoteState(stackState: StackState) {
		const results = await Promise.allSettled(
			Object.entries(stackState.resources).map(async ([urnStr, resourceState]) => {
				const urn = urnStr as URN

				if (typeof resourceState.remote === 'undefined') {
					const provider = getCloudProvider(this.props.cloudProviders, resourceState.provider)
					const remote = await this.getRemoteResource({
						urn,
						id: resourceState.id,
						type: resourceState.type,
						document: resourceState.local,
						extra: resourceState.extra,
						provider,
					})

					if (typeof remote === 'undefined') {
						throw new ResourceError(
							urn,
							resourceState.type,
							'heal',
							`Fetching remote state returned undefined`
						)
					}

					resourceState.remote = remote
				}
			})
		)

		const errors: ResourceError[] = results
			.filter(r => r.status === 'rejected')
			.map(r => (r as PromiseRejectedResult).reason)

		if (errors.length > 0) {
			throw new StackError(errors, 'Healing remote state failed.')
		}
	}
}
