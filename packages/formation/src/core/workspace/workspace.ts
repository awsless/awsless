import { randomUUID, UUID } from 'crypto'
import promiseLimit, { LimitFunction } from 'p-limit'
import { run, Step } from 'promise-dag'
import { App } from '../app'
import { CloudProvider, ResourceDocument } from '../cloud'
import { AppError, ResourceError, ResourceNotFound, StackError } from '../error'
import { LockProvider } from '../lock'
import { Resource, URN } from '../resource'
import { Stack } from '../stack'
import { AppState, ResourceState, StackState, StateProvider } from '../state'
import { loadAssets, resolveDocumentAssets } from './asset'
import { cloneObject, compareDocuments } from './document'
import { lockApp } from './lock'
import { unwrapOutputs } from './output'
import { getCloudProvider } from './provider'
import { createIdempotantToken } from './token'

export type ResourceOperation = 'create' | 'update' | 'delete' | 'heal' | 'get'
export type StackOperation = 'deploy' | 'delete'

type Options = {
	filters?: string[]
	token?: UUID
}

export class WorkSpace {
	constructor(
		protected props: {
			cloudProviders: CloudProvider[]
			stateProvider: StateProvider
			lockProvider: LockProvider
			concurrency?: number
		}
	) {}

	// private getExportedData(appState: AppState) {
	// 	const data: ExportedData = {}

	// 	for (const stackData of Object.values(appState.stacks)) {
	// 		data[stackData.name] = stackData.exports
	// 	}

	// 	return data
	// }

	private runGraph(stack: string, graph: Record<string, Step[]>) {
		try {
			const promises = run(graph)

			return Promise.allSettled(Object.values(promises))
		} catch (error) {
			if (error instanceof Error) {
				throw new StackError(stack, [], error.message)
			}

			throw error
		}
	}

	// getStackApp(stack: Stack) {
	// 	const app = stack.parent

	// 	if (!app || !(app instanceof App)) {
	// 		throw new StackError(stack.name, [], 'Stack must belong to an App')
	// 	}

	// 	return app
	// }

	// async deployStack(stack: Stack, app: App) {
	// 	return lockApp(this.props.lockProvider, app, async () => {})
	// }

	async deployApp(app: App, opt: Options = {}) {
		return lockApp(this.props.lockProvider, app, async () => {
			// -------------------------------------------------------

			const appState: AppState = (await this.props.stateProvider.get(app.urn)) ?? {
				name: app.name,
				stacks: {},
			}

			// -------------------------------------------------------
			// Set the idempotent token when no token exists.

			if (opt.token || !appState.token) {
				appState.token = opt.token ?? randomUUID()

				await this.props.stateProvider.update(app.urn, appState)
			}

			// -------------------------------------------------------
			// Filter only the selected stacks

			let stacks = app.stacks
			let filteredOutStacks: Stack[] = []

			if (opt.filters && opt.filters.length > 0) {
				stacks = app.stacks.filter(stack => opt.filters!.includes(stack.name))
				filteredOutStacks = app.stacks.filter(stack => !opt.filters!.includes(stack.name))
			}

			// -------------------------------------------------------
			// Build deployment graph

			const limit = promiseLimit(this.props.concurrency ?? 10)
			const graph: Record<URN, Step[]> = {}

			for (const stack of filteredOutStacks) {
				graph[stack.urn] = [
					async () => {
						const stackState = appState.stacks[stack.urn]

						if (stackState) {
							for (const resource of stack.resources) {
								const resourceState = stackState.resources[resource.urn]
								if (resourceState) {
									resource.setRemoteDocument(resourceState.remote)
								}
							}
						}
					},
				]
			}

			for (const stack of stacks) {
				graph[stack.urn] = [
					...[...stack.dependencies].map(dep => dep.urn),
					async () => {
						const resources = stack.resources

						// console.log('stack', stack.name)

						// -------------------------------------------------------------------

						const stackState: StackState = (appState.stacks[stack.urn] = appState.stacks[stack.urn] ?? {
							name: stack.name,
							// exports: {},
							dependencies: [],
							resources: {},
						})

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
						// Delete resources before deployment...

						if (Object.keys(deleteResourcesBefore).length > 0) {
							await this.deleteStackResources(app.urn, appState, stackState, deleteResourcesBefore, limit)
						}

						// -------------------------------------------------------------------
						// Deploy resources...

						await this.deployStackResources(app.urn, appState, stackState, resources, limit)

						// -------------------------------------------------------------------
						// Delete resources after deployment...

						if (Object.keys(deleteResourcesAfter).length > 0) {
							await this.deleteStackResources(app.urn, appState, stackState, deleteResourcesAfter, limit)
						}

						// -------------------------------------------------------------------
						// Set stack exports

						// stackState.exports = unwrapOutputsFromDocument(stack.urn, stack.exported)

						// app.setExportedData(stack.name, stackState.exports)

						// -------------------------------------------------------------------
						// Set the new stack dependencies

						stackState.dependencies = [...stack.dependencies].map(d => d.urn)
					},
				]
			}

			// -------------------------------------------------------
			// Build destroy graph

			for (const [_urn, stackState] of Object.entries(appState.stacks)) {
				const urn = _urn as URN

				const found = app.stacks.find(stack => {
					return stack.urn === urn
				})

				const filtered = opt.filters ? opt.filters!.find(filter => filter === stackState.name) : true

				if (!found && filtered) {
					graph[urn] = [
						...this.dependentsOn(appState.stacks, urn),
						async () => {
							await this.deleteStackResources(app.urn, appState, stackState, stackState.resources, limit)
							delete appState.stacks[urn]
						},
					]
				}
			}

			// -------------------------------------------------------------------

			const results = await Promise.allSettled(Object.values(run(graph)))

			// -------------------------------------------------------------------
			// Delete the idempotant token when the deployment reaches the end.

			delete appState.token

			// -------------------------------------------------------------------
			// Save state

			await this.props.stateProvider.update(app.urn, appState)

			// -------------------------------------------------------------------

			const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)

			if (errors.length > 0) {
				throw new AppError(app.name, [...new Set(errors)], 'Deploying app failed.')
			}

			return appState
		})
	}

	async deleteApp(app: App, opt: Options = {}) {
		return lockApp(this.props.lockProvider, app, async () => {
			const appState = await this.props.stateProvider.get(app.urn)

			if (!appState) {
				throw new AppError(app.name, [], `App already deleted: ${app.name}`)
			}

			// -------------------------------------------------------
			// Set the idempotent token when no token exists.

			if (opt.token || !appState.token) {
				appState.token = opt.token ?? randomUUID()

				await this.props.stateProvider.update(app.urn, appState)
			}

			// -------------------------------------------------------
			// Filter stacks

			let stacks = Object.entries(appState.stacks)

			if (opt.filters && opt.filters.length > 0) {
				stacks = stacks.filter(([_, stack]) => opt.filters!.includes(stack.name))
			}

			// -------------------------------------------------------

			const limit = promiseLimit(this.props.concurrency ?? 10)
			const graph: Record<URN, Step[]> = {}

			for (const [_urn, stackState] of stacks) {
				const urn = _urn as URN
				graph[urn] = [
					...this.dependentsOn(appState.stacks, urn),
					async () => {
						await this.deleteStackResources(app.urn, appState, stackState, stackState.resources, limit)
						delete appState.stacks[urn]
					},
				]
			}

			const results = await Promise.allSettled(Object.values(run(graph)))

			// -------------------------------------------------------

			delete appState.token

			// -------------------------------------------------------
			// Save state

			await this.props.stateProvider.update(app.urn, appState)

			// -------------------------------------------------------

			const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)

			if (errors.length > 0) {
				throw new AppError(app.name, [...new Set(errors)], 'Deleting app failed.')
			}

			// -------------------------------------------------------
			// If no errors happened we can savely delete the app
			// state when all the stacks have been deleted.

			if (Object.keys(appState.stacks).length === 0) {
				await this.props.stateProvider.delete(app.urn)
			}
		})
	}

	async hydrate(app: App) {
		const appState = await this.props.stateProvider.get(app.urn)

		if (appState) {
			for (const stack of app.stacks) {
				const stackState = appState.stacks[stack.urn]

				if (stackState) {
					for (const resource of stack.resources) {
						const resourceState = stackState.resources[resource.urn]

						if (resourceState) {
							resource.setRemoteDocument(resourceState.remote)
						}
					}
				}
			}
		}
	}

	// async diffStack(stack: Stack) {
	// 	const app = this.getStackApp(stack)

	// 	const appState = (await this.props.stateProvider.get(app.urn)) ?? {
	// 		name: app.name,
	// 		stacks: {},
	// 	}

	// 	app.setExportedData(this.getExportedData(appState))

	// 	const stackState: StackState = appState.stacks[stack.urn] ?? {
	// 		name: stack.name,
	// 		exports: {},
	// 		resources: {},
	// 	}

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
	// 			const [_, assetHashes] = await loadAssets(state.assets ?? {})
	// 			const document = unwrapOutputsFromDocument(resource.urn, state.document ?? {})

	// 			if (
	// 				!compareDocuments(
	// 					//
	// 					[resourceState.local, resourceState.assets],
	// 					[document, assetHashes]
	// 				)
	// 			) {
	// 				updates.push(resource.urn)
	// 			}
	// 		} else {
	// 			creates.push(resource.urn)
	// 		}
	// 	}

	// 	return {
	// 		changes: creates.length + updates.length + deletes.length,
	// 		creates,
	// 		updates,
	// 		deletes,
	// 	}
	// }

	private async getRemoteResource(props: {
		urn: URN
		type: string
		id: string
		document: ResourceDocument
		// assets: Record<string, ResolvedAsset>
		extra: ResourceDocument
		provider: CloudProvider
	}) {
		let remote: any
		try {
			remote = await props.provider.get(props)
		} catch (error) {
			throw ResourceError.wrap(props.urn, props.type, props.id, 'get', error)
		}

		return remote
	}

	private async deployStackResources(
		_appUrn: URN,
		appState: AppState,
		stackState: StackState,
		resources: Resource[],
		limit: LimitFunction
	) {
		// -------------------------------------------------------------------
		// Heal from unknown remote state

		await this.healFromUnknownRemoteState(stackState)

		// -------------------------------------------------------------------
		// Deploy resources...

		const deployGraph: Record<URN, Step[]> = {}

		for (const resource of resources) {
			const provider = getCloudProvider(this.props.cloudProviders, resource.cloudProviderId)

			// console.log('resource', resource.urn)

			deployGraph[resource.urn] = [
				...[...resource.dependencies].map(dep => dep.urn),
				() =>
					limit(async () => {
						// console.log('resource', resource.urn)

						const state = resource.toState()

						// console.log(state)

						const [assets, assetHashes] = await loadAssets(state.assets ?? {})
						const document = unwrapOutputs(resource.urn, state.document ?? {})
						const extra = unwrapOutputs(resource.urn, state.extra ?? {})

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
								throw ResourceError.wrap(resource.urn, resource.type, undefined, 'create', error)
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
								// assets,
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
									oldDocument: resolveDocumentAssets(cloneObject(resourceState.local), {}),
									newDocument: resolveDocumentAssets(cloneObject(document), assets),
									requiredDocumentFields: resource.requiredDocumentFields,
									oldAssets: resourceState.assets,
									newAssets: assets,
									extra,
									token,
								})
							} catch (error) {
								// If the resource wasn't found for some reason we try to create it.
								if (error instanceof ResourceNotFound) {
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
										throw ResourceError.wrap(
											resource.urn,
											resource.type,
											resourceState.id,
											'update',
											error
										)
									}
								} else {
									throw ResourceError.wrap(
										resource.urn,
										resource.type,
										resourceState.id,
										'update',
										error
									)
								}
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
								// assets,
								extra,
								provider,
							})

							resourceState.remote = remote
						}

						resourceState.extra = extra
						resourceState.dependencies = [...resource.dependencies].map(d => d.urn)
						resourceState.policies.deletion = resource.deletionPolicy

						resource.setRemoteDocument(resourceState.remote)
					}),
			]
		}

		// let resultGraph
		// try {
		// 	resultGraph = run(deployGraph)
		// } catch (error) {
		// 	throw new StackError(stackState.name, [], 'Deploying resources failed.')
		// }

		// const results = await Promise.allSettled(Object.values(resultGraph))

		const results = await this.runGraph(stackState.name, deployGraph)

		// if (results.length > 0) {
		// 	await this.props.stateProvider.update(appUrn, appState)
		// }

		// for (const result of results) {
		// 	if (result.status === 'rejected') {
		// 		throw result.reason
		// 	}
		// }

		const errors: ResourceError[] = results
			.filter(r => r.status === 'rejected')
			.map(r => (r as PromiseRejectedResult).reason)

		if (errors.length > 0) {
			throw new StackError(stackState.name, [...new Set(errors)], 'Deploying resources failed.')
		}
	}

	private dependentsOn(resources: Record<URN, { dependencies: URN[] }>, dependency: URN) {
		const dependents: URN[] = []

		for (const [urn, resource] of Object.entries(resources)) {
			if (resource.dependencies.includes(dependency)) {
				dependents.push(urn as URN)
			}
		}

		return dependents
	}

	private async deleteStackResources(
		_appUrn: URN,
		appState: AppState,
		stackState: StackState,
		resources: Record<URN, ResourceState>,
		limit: LimitFunction
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
				() =>
					limit(async () => {
						if (state.policies.deletion !== 'retain') {
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
									throw ResourceError.wrap(urn, state.type, state.id, 'delete', error)
								}
							}
						}

						// -------------------------------------------------------------------
						// Delete the resource from the stack state

						delete stackState.resources[urn]
					}),
			]
		}

		const results = await this.runGraph(stackState.name, deleteGraph)

		// -------------------------------------------------------------------
		// Save changed AppState

		// if (results.length > 0) {
		// 	await this.props.stateProvider.update(appUrn, appState)
		// }

		const errors: ResourceError[] = results
			.filter(r => r.status === 'rejected')
			.map(r => (r as PromiseRejectedResult).reason)

		if (errors.length > 0) {
			throw new StackError(appState.name, [...new Set(errors)], 'Deleting resources failed.')
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
						// assets: resourceState.assets,
						extra: resourceState.extra,
						provider,
					})

					if (typeof remote === 'undefined') {
						throw new ResourceError(
							urn,
							resourceState.type,
							resourceState.id,
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
			throw new StackError(stackState.name, [...new Set(errors)], 'Healing remote state failed.')
		}
	}
}
