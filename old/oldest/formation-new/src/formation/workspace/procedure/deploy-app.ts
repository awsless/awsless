import { App } from '../../app.ts'
import { createDebugger } from '../../debug.ts'
import { resolveInputs } from '../../input.ts'
import { isDataSource, isResource } from '../../node.ts'
import { Stack } from '../../stack.ts'
import { URN } from '../../urn.ts'
import { concurrencyQueue } from '../concurrency.ts'
import { DependencyGraph, dependentsOn } from '../dependency.ts'
import { entries } from '../entries.ts'
import { AppError, ResourceError } from '../error.ts'
import { onExit } from '../exit.ts'
import { requiresReplacement } from '../replacement.ts'
import { compareState, NodeState, removeEmptyStackStates, StackState } from '../state.ts'
import { migrateAppState } from '../state/migrate.ts'
import { ProcedureOptions, WorkSpaceOptions } from '../workspace.ts'
import { createResource } from './create-resource.ts'
import { deleteResource } from './delete-resource.ts'
import { getDataSource } from './get-data-source.ts'
import { importResource } from './import-resource.ts'
import { replaceResource } from './replace-resource.ts'
import { updateResource } from './update-resource.ts'

const debug = createDebugger('Deploy App')

export const deployApp = async (app: App, opt: WorkSpaceOptions & ProcedureOptions) => {
	debug(app.name, 'start')

	const latestState = await opt.backend.state.get(app.urn)

	// -------------------------------------------------------
	// Migrate the state file to the latest version

	const appState = migrateAppState(
		latestState ?? {
			name: app.name,
			stacks: {},
		}
	)

	// -------------------------------------------------------
	// Save state on process graseful exit

	const releaseOnExit = onExit(async () => {
		await opt.backend.state.update(app.urn, appState)
	})

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

	const allNodes: Record<URN, NodeState> = {}

	for (const stackState of Object.values(appState.stacks)) {
		for (const [urn, nodeState] of entries(stackState.nodes)) {
			allNodes[urn] = nodeState
		}
	}

	// -------------------------------------------------------
	// First hydrate the resources that we won't deploy

	for (const stack of filteredOutStacks) {
		const stackState = appState.stacks[stack.urn]

		if (stackState) {
			for (const node of stack.nodes) {
				const nodeState = stackState.nodes[node.$.urn]
				if (nodeState && nodeState.output) {
					graph.add(node.$.urn, [], async () => {
						debug('hydrate', node.$.urn)
						node.$.resolve(nodeState.output)
					})
				}
			}
		}
	}

	// -------------------------------------------------------
	// Delete the resources from stacks that have been removed

	for (const [urn, stackState] of entries(appState.stacks)) {
		const found = app.stacks.find(stack => {
			return stack.urn === urn
		})

		const filtered = opt.filters ? opt.filters!.find(filter => filter === stackState.name) : true

		if (!found && filtered) {
			for (const [urn, nodeState] of entries(stackState.nodes)) {
				graph.add(urn, dependentsOn(allNodes, urn), async () => {
					if (nodeState.tag === 'resource') {
						await queue(() =>
							deleteResource(
								//
								appState.idempotentToken!,
								urn,
								nodeState,
								opt
							)
						)
					}

					delete stackState.nodes[urn]
				})
			}
		}
	}

	// -------------------------------------------------------
	// Sync the stacks that still exist

	for (const stack of stacks) {
		// -------------------------------------------------------------------
		// Get or create the stack state

		const stackState = (appState.stacks[stack.urn] =
			appState.stacks[stack.urn] ??
			({
				name: stack.name,
				nodes: {},
			} satisfies StackState))

		// -------------------------------------------------------------------
		// Delete resources that no longer exist in the stack

		for (const [urn, nodeState] of entries(stackState.nodes)) {
			const resource = stack.nodes.find(r => r.$.urn === urn)

			if (!resource) {
				graph.add(urn, dependentsOn(allNodes, urn), async () => {
					if (nodeState.tag === 'resource') {
						await queue(() =>
							deleteResource(
								//
								appState.idempotentToken!,
								urn,
								nodeState,
								opt
							)
						)
					}

					delete stackState.nodes[urn]
				})
			}
		}

		// -------------------------------------------------------------------
		// Create or update resources

		for (const node of stack.nodes) {
			const dependencies: URN[] = [...node.$.dependencies]

			const partialNewResourceState = {
				dependencies,
				lifecycle: isResource(node)
					? {
							// deleteAfterCreate: node.$.config?.deleteAfterCreate,
							retainOnDelete: node.$.config?.retainOnDelete,
						}
					: undefined,
			}

			graph.add(node.$.urn, dependencies, () => {
				return queue(async () => {
					let nodeState = stackState.nodes[node.$.urn]

					let input
					try {
						input = await resolveInputs(node.$.input)
					} catch (error) {
						throw ResourceError.wrap(
							//
							node.$.urn,
							node.$.type,
							'resolve',
							error
						)
					}

					// --------------------------------------------------
					// Data Source
					// --------------------------------------------------

					if (isDataSource(node)) {
						if (!nodeState) {
							// NEW
							const dataSourceState = await getDataSource(node.$, input, opt)
							nodeState = stackState.nodes[node.$.urn] = {
								...dataSourceState,
								...partialNewResourceState,
							}
						} else if (!compareState(nodeState.input, input)) {
							// UPDATE
							const dataSourceState = await getDataSource(node.$, input, opt)
							Object.assign(nodeState, {
								...dataSourceState,
								...partialNewResourceState,
							})
						} else {
							Object.assign(nodeState, partialNewResourceState)
						}
					}

					// --------------------------------------------------
					// Resource
					// --------------------------------------------------

					if (isResource(node)) {
						// --------------------------------------------------
						// New resource

						if (!nodeState) {
							// --------------------------------------------------
							// Import resource if needed

							if (node.$.config?.import) {
								const importedState = await importResource(node, input, opt)
								const newResourceState = await updateResource(
									node,
									appState.idempotentToken!,
									importedState.output,
									input,
									opt
								)

								nodeState = stackState.nodes[node.$.urn] = {
									...importedState,
									...newResourceState,
									...partialNewResourceState,
								}
							} else {
								// --------------------------------------------------
								// Create resource

								const newResourceState = await createResource(
									node,
									appState.idempotentToken!,
									input,
									opt
								)

								nodeState = stackState.nodes[node.$.urn] = {
									...newResourceState,
									...partialNewResourceState,
								}
							}
						} else if (
							// --------------------------------------------------
							// Check if any state has changed
							!compareState(nodeState.input, input)
						) {
							let newResourceState

							if (requiresReplacement(nodeState.input, input, node.$.config?.replaceOnChanges ?? [])) {
								// --------------------------------------------------
								// Replace resource

								newResourceState = await replaceResource(
									node,
									appState.idempotentToken!,
									nodeState.output!,
									input,
									opt
								)
							} else {
								// --------------------------------------------------
								// Update resource

								newResourceState = await updateResource(
									node,
									appState.idempotentToken!,
									nodeState.output!,
									input,
									opt
								)
							}

							Object.assign(nodeState, {
								input,
								...newResourceState,
								...partialNewResourceState,
							})
						} else {
							Object.assign(nodeState, partialNewResourceState)
						}
					}

					// --------------------------------------------------
					// Hydrate node

					if (nodeState?.output) {
						node.$.resolve(nodeState.output)
					}
				})
			})
		}
	}

	// -------------------------------------------------------------------
	// Execute deployment graph

	const errors = await graph.run()

	// -------------------------------------------------------------------
	// Remove empty stacks from app state

	removeEmptyStackStates(appState)

	// -------------------------------------------------------------------
	// Delete the idempotant token when the deployment reaches the end.

	delete appState.idempotentToken

	// -------------------------------------------------------------------
	// Save state

	await opt.backend.state.update(app.urn, appState)

	// -------------------------------------------------------------------
	// Release the onExit

	releaseOnExit()

	debug(app.name, 'done')

	// -------------------------------------------------------------------

	if (errors.length > 0) {
		throw new AppError(app.name, [...new Set(errors)], 'Deploying app failed.')
	}

	// -------------------------------------------------------
	// If no errors happened we can savely delete the app
	// state when all the stacks have been deleted.

	if (Object.keys(appState.stacks).length === 0) {
		await opt.backend.state.delete(app.urn)
	}

	return appState
}
