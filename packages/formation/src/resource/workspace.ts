import EventEmitter from 'events'
import { Asset, ResolvedAsset } from './asset'
import { CloudProvider, ResourceDocument } from './cloud'
import { Input, unwrap } from './output'
import { Resource, URN } from './resource'
import { Stack } from './stack'
import { AppState, ResourceState, StackState, StateProvider } from './state'
import { Step, run } from 'promise-dag'
import TypedEmitter from 'typed-emitter'

type ResourceEvent = {
	urn: URN
	type: string
	operation: 'create' | 'update' | 'delete'
	status: 'success' | 'in-progress' | 'error'
	reason?: Error
}

type StackEvent = {
	urn: URN
	operation: 'deploy' | 'delete'
	status: 'success' | 'in-progress' | 'error'
	stack: Stack
	reason?: Error
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

	protected getCloudProvider(providerId: string) {
		for (const provider of this.props.cloudProviders) {
			if (provider.own(providerId)) {
				return provider
			}
		}

		throw new TypeError(`Can't find cloud provider for: ${providerId}`)
	}

	protected copyDocument<T>(document: T) {
		return JSON.parse(JSON.stringify(document))
	}

	protected unwrapDocument(urn: URN, document: ResourceDocument): ResourceDocument {
		const replacer = (_: string, value: unknown) => {
			return typeof value === 'bigint' ? Number(value) : value
		}

		try {
			// 1. Smart hack to transform all outputs to values
			// 2. It also converts bigints to numbers

			return JSON.parse(JSON.stringify(document, replacer))
		} catch (error) {
			if (error instanceof TypeError) {
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

	async deployStack(stack: Stack) {
		if (!stack.parent) {
			throw new TypeError('Stack must belong to an App')
		}

		const appUrn = stack.parent.urn

		return this.lockedOperation(appUrn, async () => {
			const appState = await this.props.stateProvider.get(appUrn)
			const stackState = (appState[stack.urn] = appState[stack.urn] ?? {})
			const resources = stack.resources

			// -------------------------------------------------------------------

			this.emit('stack', {
				urn: stack.urn,
				operation: 'deploy',
				status: 'in-progress',
				stack,
			})

			// -------------------------------------------------------------------
			// Find Deletable resources...

			const deleteResources: Record<URN, ResourceState> = {}

			for (const [urn, state] of Object.entries(stackState)) {
				const resource = resources.find(r => r.urn === urn)
				if (!resource) {
					deleteResources[urn as URN] = state
				}
			}

			// -------------------------------------------------------------------
			// Process resources...

			try {
				// -------------------------------------------------------------------
				// Delete resources...

				if (Object.keys(deleteResources).length > 0) {
					await this.deleteStackResources(appUrn, appState, stackState, deleteResources)
				}

				// -------------------------------------------------------------------
				// Deploy resources...

				await this.deployStackResources(appUrn, appState, stackState, resources)

				// -------------------------------------------------------------------
			} catch (error) {
				this.emit('stack', {
					urn: stack.urn,
					operation: 'deploy',
					status: 'error',
					stack,
					reason: error instanceof Error ? error : new Error('Unknown Error'),
				})

				throw error
			}

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
		if (!stack.parent) {
			throw new TypeError('Stack must belong to an App')
		}

		const appUrn = stack.parent.urn

		return this.lockedOperation(appUrn, async () => {
			const appState = await this.props.stateProvider.get(appUrn)
			const stackState = appState[stack.urn]

			if (!stackState) {
				throw new Error(`Stack already deleted: ${stack.name}`)
			}

			this.emit('stack', {
				urn: stack.urn,
				operation: 'delete',
				status: 'in-progress',
				stack,
			})

			try {
				await this.deleteStackResources(appUrn, appState, stackState, stackState)
			} catch (error) {
				this.emit('stack', {
					urn: stack.urn,
					operation: 'delete',
					status: 'error',
					stack,
					reason: error instanceof Error ? error : new Error('Unknown Error'),
				})

				throw error
			}

			delete appState[stack.urn]

			await this.props.stateProvider.update(appUrn, appState)

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
			const provider = this.getCloudProvider(resource.cloudProviderId)

			deployGraph[resource.urn] = [
				...[...resource.dependencies].map(dep => dep.urn),
				async () => {
					const state = resource.toState()
					const [assets, assetHashes] = await this.resolveAssets(state.assets ?? {})
					const document = this.unwrapDocument(resource.urn, state.document ?? {})
					const extra = this.unwrapDocument(resource.urn, state.extra ?? {})
					const resourceState = stackState[resource.urn]

					if (!resourceState) {
						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'create',
							status: 'in-progress',
						})

						let id
						try {
							id = await provider.create({
								urn: resource.urn,
								type: resource.type,
								document,
								assets,
								extra,
							})
						} catch (error) {
							this.emit('resource', {
								urn: resource.urn,
								type: resource.type,
								operation: 'create',
								status: 'error',
								reason: error instanceof Error ? error : new Error('Unknown Error'),
							})

							throw error
						}

						stackState[resource.urn] = {
							id,
							type: resource.type,
							provider: resource.cloudProviderId,
							local: document,
							assets: assetHashes,
							dependencies: [...resource.dependencies].map(d => d.urn),
							extra,
							// deletionPolicy: unwrap(state.deletionPolicy),
						}

						const remote = await provider.get({
							urn: resource.urn,
							id,
							type: resource.type,
							document,
							extra,
						})

						stackState[resource.urn].remote = remote

						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'create',
							status: 'success',
						})
					} else if (
						// Check if any state has changed
						JSON.stringify([resourceState.local, resourceState.assets]) !==
						JSON.stringify([document, assetHashes])
					) {
						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'update',
							status: 'in-progress',
						})

						let id
						try {
							id = await provider.update({
								urn: resource.urn,
								id: resourceState.id,
								type: resource.type,
								remoteDocument: this.copyDocument(resourceState.remote),
								oldDocument: this.copyDocument(resourceState.local),
								newDocument: document,
								assets,
								extra,
							})
						} catch (error) {
							this.emit('resource', {
								urn: resource.urn,
								type: resource.type,
								operation: 'update',
								status: 'error',
								reason: error instanceof Error ? error : new Error('Unknown Error'),
							})

							throw error
						}

						stackState[resource.urn].id = id
						stackState[resource.urn].local = document
						stackState[resource.urn].assets = assetHashes

						// This command might fail.
						// We will need to heal the state if this fails.

						const remote = await provider.get({
							urn: resource.urn,
							id: resourceState.id,
							type: resource.type,
							document,
							extra,
						})

						stackState[resource.urn].remote = remote

						this.emit('resource', {
							urn: resource.urn,
							type: resource.type,
							operation: 'update',
							status: 'success',
						})
					}

					// stackState[resource.urn].deletionPolicy = unwrap(state.deletionPolicy)
					stackState[resource.urn].extra = extra
					stackState[resource.urn].dependencies = [...resource.dependencies].map(d => d.urn)

					resource.setRemoteDocument(stackState[resource.urn].remote)
				},
			]
		}

		const results = await Promise.allSettled(Object.values(run(deployGraph)))

		await this.props.stateProvider.update(appUrn, appState)

		for (const result of results) {
			if (result.status === 'rejected') {
				throw result.reason
			}
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
			const provider = this.getCloudProvider(state.provider)

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
						this.emit('resource', {
							urn,
							type: state.type,
							operation: 'delete',
							status: 'error',
							reason: error instanceof Error ? error : new Error('Unknown Error'),
						})

						throw error
					}

					// -------------------------------------------------------------------
					// Delete the resource from the stack state

					delete stackState[urn]

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

		for (const result of deleteResults) {
			if (result.status === 'rejected') {
				throw result.reason
			}
		}
	}

	private async healFromUnknownRemoteState(stackState: StackState) {
		const results = await Promise.allSettled(
			Object.entries(stackState).map(async ([urnStr, resourceState]) => {
				const urn = urnStr as URN
				if (typeof resourceState.remote === 'undefined') {
					const provider = this.getCloudProvider(resourceState.provider)
					const remote = await provider.get({
						urn,
						id: resourceState.id,
						type: resourceState.type,
						document: resourceState.local,
						extra: resourceState.extra,
					})

					if (typeof remote === 'undefined') {
						throw new Error(`Fetching remote state returned undefined: ${urn}`)
					}

					resourceState.remote = remote
				}
			})
		)

		for (const result of results) {
			if (result.status === 'rejected') {
				throw result.reason
			}
		}
	}
}
