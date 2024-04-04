import EventEmitter from 'events'
import { Asset, ResolvedAsset } from './asset'
import { CloudProvider, ResourceDocument } from './cloud'
import { Input, Output, unwrap } from './output'
import { Resource, URN } from './resource'
import { Stack } from './stack'
import { AppState, ResourceState, StackState, StateProvider } from './state'
import { Step, run } from 'promise-dag'
import TypedEmitter from 'typed-emitter'
import { ResourceError, ResourceNotFound, StackError } from './error'
import { App } from './app'
import { ExportedData } from './export'

export type ResourceOperation = 'create' | 'update' | 'delete' | 'heal'
export type StackOperation = 'deploy' | 'delete'

type ResourceEvent = {
	urn: URN
	type: string
	operation: ResourceOperation
	status: 'success' | 'in-progress' | 'error'
	reason?: ResourceError
}

type StackEvent = {
	urn: URN
	operation: StackOperation
	status: 'success' | 'in-progress' | 'error'
	stack: Stack
	reason?: StackError
}

type Events = {
	stack: (event: StackEvent) => void
	resource: (event: ResourceEvent) => void
}

export class WorkSpace extends (EventEmitter as new () => TypedEmitter<Events>) {
	constructor(
		protected props: {
			cloudProviders: CloudProvider[]
			stateProvider: StateProvider
		}
	) {
		super()
	}

	protected getCloudProvider(providerId: string, urn: URN) {
		for (const provider of this.props.cloudProviders) {
			if (provider.own(providerId)) {
				return provider
			}
		}

		throw new TypeError(`Can't find the "${providerId}" cloud provider for: ${urn}`)
	}

	protected unwrapDocument(urn: URN, document: ResourceDocument, safe = true): ResourceDocument {
		const replacer = (_: string, value: unknown) => {
			if (value instanceof Output) {
				if (safe) {
					return value.valueOf()
				} else {
					try {
						return value.valueOf()
					} catch (e) {
						return '[UnresolvedOutput]'
					}
				}
			}

			if (typeof value === 'bigint') {
				return Number(value)
			}

			return value
		}

		try {
			// 1. Smart hack to transform all outputs to values
			// 2. It also converts bigints to numbers

			return this.copy(document, replacer)
		} catch (error) {
			if (error instanceof TypeError) {
				// throw error

				throw new TypeError(`Resource has unresolved inputs: ${urn}`)
			}

			throw error
		}
	}

	protected async lockedOperation<T>(urn: URN, fn: () => T): Promise<Awaited<T>> {
		let release
		try {
			release = await this.props.stateProvider.lock(urn)
		} catch (error) {
			throw new Error(`Already in progress: ${urn}`)
		}

		let result: Awaited<T>

		try {
			result = await fn()
		} catch (error) {
			throw error
		} finally {
			await release()
		}

		return result!
	}

	protected async resolveAssets(assets: Record<string, Input<Asset>>) {
		const resolved: Record<string, ResolvedAsset> = {}
		const hashes: Record<string, string> = {}

		await Promise.all(
			Object.entries(assets).map(async ([name, asset]) => {
				const data = await unwrap(asset).load()
				const buff = await crypto.subtle.digest('SHA-256', data)
				const hash = Buffer.from(buff).toString('hex')

				hashes[name] = hash
				resolved[name] = {
					data,
					hash,
				}
			})
		)

		return [resolved, hashes] as const
	}

	protected copy<T>(document: T, replacer?: any): T {
		return JSON.parse(JSON.stringify(document, replacer))
	}

	protected compare<T>(left: T, right: T) {
		// order the object keys so that the comparison works.
		const replacer = (_: unknown, value: unknown) => {
			if (value !== null && value instanceof Object && !Array.isArray(value)) {
				return Object.keys(value)
					.sort()
					.reduce((sorted, key) => {
						sorted[key] = value[key]
						return sorted
					}, {})
			}
			return value
		}

		const l = JSON.stringify(left, replacer)
		const r = JSON.stringify(right, replacer)

		return l === r
	}

	protected resolveDocumentAssets(document: any, assets: Record<string, ResolvedAsset>): ResourceDocument {
		if (document !== null && typeof document === 'object') {
			for (const [key, value] of Object.entries(document)) {
				if (
					value !== null &&
					typeof value === 'object' &&
					'__ASSET__' in value &&
					typeof value.__ASSET__ === 'string'
				) {
					document[key] = assets[value.__ASSET__]?.data.toString('utf8')
				} else {
					this.resolveDocumentAssets(value, assets)
				}
			}
		} else if (Array.isArray(document)) {
			for (const value of document) {
				this.resolveDocumentAssets(value, assets)
			}
		}

		return document
	}

	private getExportedData(appState: AppState) {
		const data: ExportedData = {}

		for (const stackData of Object.values(appState)) {
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

	async diffStack(stack: Stack) {
		const app = stack.parent

		if (!app || !(app instanceof App)) {
			throw new StackError([], 'Stack must belong to an App')
		}

		const appState = await this.props.stateProvider.get(app.urn)

		const stackState = (appState[stack.urn] = appState[stack.urn] ?? {
			name: stack.name,
			exports: {},
			resources: {},
		})

		const resources = stack.resources

		const creates: URN[] = []
		const updates: URN[] = []
		const deletes: URN[] = []

		for (const resource of resources) {
			const resourceState = stackState.resources[resource.urn]

			if (resourceState) {
				resource.setRemoteDocument(resourceState.remote)
			}
		}

		for (const urn of Object.keys(stackState.resources)) {
			const resource = resources.find(r => r.urn === urn)

			if (!resource) {
				deletes.push(urn as URN)
			}
		}

		for (const resource of resources) {
			const resourceState = stackState.resources[resource.urn]

			if (resourceState) {
				const state = resource.toState()
				const [_, assetHashes] = await this.resolveAssets(state.assets ?? {})
				const document = this.unwrapDocument(resource.urn, state.document ?? {}, false)

				if (
					!this.compare(
						//
						[resourceState.local, resourceState.assets],
						[document, assetHashes]
					)
				) {
					// console.log('S', JSON.stringify(resourceState.local))
					// console.log('D', JSON.stringify(document))

					updates.push(resource.urn)
				}
			} else {
				creates.push(resource.urn)
			}
		}

		return {
			creates,
			updates,
			deletes,
		}
	}

	async deployStack(stack: Stack) {
		const app = stack.parent

		if (!app || !(app instanceof App)) {
			throw new StackError([], 'Stack must belong to an App')
		}

		return this.lockedOperation(app.urn, async () => {
			const appState = await this.props.stateProvider.get(app.urn)
			const stackState = (appState[stack.urn] = appState[stack.urn] ?? {
				name: stack.name,
				exports: {},
				resources: {},
			})

			const resources = stack.resources

			// -------------------------------------------------------------------
			// Set the exported data on the app.

			app.setExportedData(this.getExportedData(appState))

			// -------------------------------------------------------------------

			this.emit('stack', {
				urn: stack.urn,
				operation: 'deploy',
				status: 'in-progress',
				stack,
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

				this.emit('stack', {
					urn: stack.urn,
					operation: 'deploy',
					status: 'error',
					stack,
					reason: error,
				})

				throw error
			}

			// -------------------------------------------------------------------
			// Save stack exports

			// const exports = this.unwrapDocument(stack.urn, stack.exports)
			// console.log('unwrapped-exports', exports, stack.exports)

			stackState.exports = this.unwrapDocument(stack.urn, stack.exported)

			await this.props.stateProvider.update(app.urn, appState)

			// -------------------------------------------------------------------

			this.emit('stack', {
				urn: stack.urn,
				operation: 'deploy',
				status: 'success',
				stack,
			})

			return stackState
		})
	}

	async deleteStack(stack: Stack) {
		const app = stack.parent

		if (!app || !(app instanceof App)) {
			throw new StackError([], 'Stack must belong to an App')
		}

		return this.lockedOperation(app.urn, async () => {
			const appState = await this.props.stateProvider.get(app.urn)
			const stackState = appState[stack.urn]

			if (!stackState) {
				throw new StackError([], `Stack already deleted: ${stack.name}`)
			}

			this.emit('stack', {
				urn: stack.urn,
				operation: 'delete',
				status: 'in-progress',
				stack,
			})

			try {
				await this.deleteStackResources(app.urn, appState, stackState, stackState.resources)
			} catch (error) {
				this.emit('stack', {
					urn: stack.urn,
					operation: 'delete',
					status: 'error',
					stack,
					reason: error,
				})

				throw error
			}

			delete appState[stack.urn]

			await this.props.stateProvider.update(app.urn, appState)

			this.emit('stack', {
				urn: stack.urn,
				operation: 'delete',
				status: 'success',
				stack,
			})
		})
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
			const provider = this.getCloudProvider(resource.cloudProviderId, resource.urn)

			deployGraph[resource.urn] = [
				...[...resource.dependencies].map(dep => dep.urn),
				async () => {
					const state = resource.toState()
					const [assets, assetHashes] = await this.resolveAssets(state.assets ?? {})
					const document = this.unwrapDocument(resource.urn, state.document ?? {})
					const extra = this.unwrapDocument(resource.urn, state.extra ?? {})
					let resourceState = stackState.resources[resource.urn]

					if (!resourceState) {
						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'create',
							status: 'in-progress',
						})

						let id: string
						try {
							id = await provider.create({
								urn: resource.urn,
								type: resource.type,
								document: this.resolveDocumentAssets(this.copy(document), assets),
								assets,
								extra,
							})
						} catch (error) {
							const resourceError = ResourceError.wrap(resource.urn, resource.type, 'create', error)

							this.emit('resource', {
								urn: resource.urn,
								type: resource.type,
								operation: 'create',
								status: 'error',
								reason: resourceError,
							})

							throw resourceError
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
							// deletionPolicy: unwrap(state.deletionPolicy),
						}

						const remote = await provider.get({
							urn: resource.urn,
							id,
							type: resource.type,
							document,
							extra,
						})

						resourceState.remote = remote

						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'create',
							status: 'success',
						})
					} else if (
						// Check if any state has changed
						!this.compare(
							//
							[resourceState.local, resourceState.assets],
							[document, assetHashes]
						)
					) {
						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'update',
							status: 'in-progress',
						})

						// this.resolveDocumentAssets(this.copy(document), assets),

						let id: string
						try {
							id = await provider.update({
								urn: resource.urn,
								id: resourceState.id,
								type: resource.type,
								remoteDocument: this.resolveDocumentAssets(
									this.copy(resourceState.remote),
									assets
								),
								oldDocument: this.resolveDocumentAssets(this.copy(resourceState.local), assets),
								newDocument: document,
								assets,
								extra,
							})
						} catch (error) {
							const resourceError = ResourceError.wrap(resource.urn, resource.type, 'update', error)

							this.emit('resource', {
								urn: resource.urn,
								type: resource.type,
								operation: 'update',
								status: 'error',
								reason: resourceError,
							})

							throw resourceError
						}

						resourceState.id = id
						resourceState.local = document
						resourceState.assets = assetHashes

						// This command might fail.
						// We will need to heal the state if this fails.

						const remote = await provider.get({
							urn: resource.urn,
							id: resourceState.id,
							type: resource.type,
							document,
							extra,
						})

						resourceState.remote = remote

						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'update',
							status: 'success',
						})
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
			.map((r: PromiseRejectedResult) => r.reason)

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
			const provider = this.getCloudProvider(state.provider, urn)

			deleteGraph[urn] = [
				...this.dependentsOn(resources, urn),
				async () => {
					this.emit('resource', {
						urn,
						type: state.type,
						operation: 'delete',
						status: 'in-progress',
					})

					try {
						await provider.delete({
							urn,
							id: state.id,
							type: state.type,
							document: state.local,
							assets: state.assets,
							extra: state.extra,
						})
					} catch (error) {
						if (error instanceof ResourceNotFound) {
							// The resource has already been deleted.
							// Let's skip this issue.
						} else {
							const resourceError = ResourceError.wrap(urn, state.type, 'delete', error)

							this.emit('resource', {
								urn,
								type: state.type,
								operation: 'delete',
								status: 'error',
								reason: resourceError,
							})

							throw resourceError
						}
					}

					// -------------------------------------------------------------------
					// Delete the resource from the stack state

					delete stackState.resources[urn]

					this.emit('resource', {
						urn,
						type: state.type,
						operation: 'delete',
						status: 'success',
					})
				},
			]
		}

		const deleteResults = await Promise.allSettled(Object.values(run(deleteGraph)))

		// -------------------------------------------------------------------
		// Save changed AppState

		await this.props.stateProvider.update(appUrn, appState)

		const errors: ResourceError[] = deleteResults
			.filter(r => r.status === 'rejected')
			.map((r: PromiseRejectedResult) => r.reason)

		if (errors.length > 0) {
			throw new StackError(errors, 'Deleting resources failed.')
		}
	}

	private async healFromUnknownRemoteState(stackState: StackState) {
		const results = await Promise.allSettled(
			Object.entries(stackState.resources).map(async ([urnStr, resourceState]) => {
				const urn = urnStr as URN
				if (typeof resourceState.remote === 'undefined') {
					const provider = this.getCloudProvider(resourceState.provider, urn)
					const remote = await provider.get({
						urn,
						id: resourceState.id,
						type: resourceState.type,
						document: resourceState.local,
						extra: resourceState.extra,
					})

					if (typeof remote === 'undefined') {
						const resourceError = new ResourceError(
							urn,
							resourceState.type,
							'heal',
							`Fetching remote state returned undefined`
						)

						this.emit('resource', {
							urn,
							type: resourceState.type,
							operation: 'heal',
							status: 'error',
							reason: resourceError,
						})

						throw resourceError
					}

					resourceState.remote = remote
				}
			})
		)

		const errors: ResourceError[] = results
			.filter(r => r.status === 'rejected')
			.map((r: PromiseRejectedResult) => r.reason)

		if (errors.length > 0) {
			throw new StackError(errors, 'Healing remote state failed.')
		}
	}
}
