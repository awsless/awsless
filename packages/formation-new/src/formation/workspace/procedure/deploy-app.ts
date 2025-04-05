import { App } from '../../app.ts'
import { URN } from '../../resource.ts'
import { Stack } from '../../stack.ts'
import { concurrencyQueue } from '../concurrency.ts'
import { DependencyGraph, dependentsOn } from '../dependency.ts'
import { entries } from '../entries.ts'
import { AppError } from '../error.ts'
import { AppState, ResourceState, StackState } from '../state.ts'
import { ProcedureOptions, WorkSpaceOptions } from '../workspace.ts'
import { deleteStackResources } from './delete-stack.ts'
import { deployStackResources } from './deploy-stack.ts'

export const deployApp = async (app: App, opt: WorkSpaceOptions & ProcedureOptions) => {
	const appState =
		(await opt.backend.state.get(app.urn)) ??
		({
			name: app.name,
			stacks: {},
		} satisfies AppState)

	// -------------------------------------------------------
	// Set the idempotent token when no token exists.

	if (opt.idempotentToken || !appState.idempotentToken) {
		appState.idempotentToken = opt.idempotentToken ?? crypto.randomUUID()

		await opt.backend.state.update(app.urn, appState)
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

	const queue = concurrencyQueue(opt.concurrency ?? 10)
	const graph = new DependencyGraph()

	// -------------------------------------------------------
	// First hydrate the resources that we won't deploy

	for (const stack of filteredOutStacks) {
		graph.add(stack.urn, [], async () => {
			const stackState = appState.stacks[stack.urn]

			if (stackState) {
				for (const resource of stack.resources) {
					const resourceState = stackState.resources[resource.urn]
					if (resourceState && resourceState.output) {
						resource.$.resolve(resourceState.output)
					}
				}
			}
		})
	}

	// -------------------------------------------------------
	// Sync the stacks that still exist

	for (const stack of stacks) {
		graph.add(
			stack.urn,
			[...stack.dependencies].map(dep => dep.urn),
			async () => {
				const resources = stack.resources

				// -------------------------------------------------------------------

				const stackState = (appState.stacks[stack.urn] =
					appState.stacks[stack.urn] ??
					({
						name: stack.name,
						dependencies: [],
						resources: {},
					} satisfies StackState))

				// -------------------------------------------------------------------
				// Find resources that need to be deleted...

				const deleteResourcesBefore: Record<URN, ResourceState> = {}
				const deleteResourcesAfter: Record<URN, ResourceState> = {}

				for (const [urn, state] of entries(stackState.resources)) {
					const resource = resources.find(r => r.$.urn === urn)

					if (!resource) {
						if (state.lifecycle?.deleteBeforeCreate) {
							deleteResourcesBefore[urn] = state
						} else {
							deleteResourcesAfter[urn] = state
						}
					}
				}

				// -------------------------------------------------------------------
				// Delete resources before deployment...

				if (Object.keys(deleteResourcesBefore).length > 0) {
					await deleteStackResources(stackState, deleteResourcesBefore, appState.idempotentToken!, queue, opt)
				}

				// -------------------------------------------------------------------
				// Deploy resources...

				await deployStackResources(
					stackState,
					resources,
					// stack.dataSources,
					appState.idempotentToken!,
					queue,
					opt
				)

				// -------------------------------------------------------------------
				// Delete resources after deployment...

				if (Object.keys(deleteResourcesAfter).length > 0) {
					await deleteStackResources(stackState, deleteResourcesAfter, appState.idempotentToken!, queue, opt)
				}

				// -------------------------------------------------------------------
				// Set the new stack dependencies

				stackState.dependencies = [...stack.dependencies].map(d => d.urn)
			}
		)
	}

	// -------------------------------------------------------
	// Delete the stacks that have been removed

	for (const [urn, stackState] of entries(appState.stacks)) {
		const found = app.stacks.find(stack => {
			return stack.urn === urn
		})

		const filtered = opt.filters ? opt.filters!.find(filter => filter === stackState.name) : true

		if (!found && filtered) {
			graph.add(urn, dependentsOn(appState.stacks, urn), async () => {
				await deleteStackResources(stackState, stackState.resources, appState.idempotentToken!, queue, opt)

				delete appState.stacks[urn]
			})
		}
	}

	// -------------------------------------------------------------------

	const results = await graph.run()

	// -------------------------------------------------------------------
	// Delete the idempotant token when the deployment reaches the end.

	delete appState.idempotentToken

	// -------------------------------------------------------------------
	// Save state

	await opt.backend.state.update(app.urn, appState)

	// -------------------------------------------------------------------

	const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)

	if (errors.length > 0) {
		throw new AppError(app.name, [...new Set(errors)], 'Deploying app failed.')
	}

	return appState
}
