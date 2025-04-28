import { App } from '../../app.ts'
import { createDebugger } from '../../debug.ts'
import { Stack } from '../../stack.ts'
import { URN } from '../../urn.ts'
import { concurrencyQueue } from '../concurrency.ts'
import { DependencyGraph, dependentsOn } from '../dependency.ts'
import { entries } from '../entries.ts'
import { AppError } from '../error.ts'
import { onExit } from '../exit.ts'
import { NodeState, StackState } from '../state.ts'
import { migrateAppState } from '../state/migrate.ts'
import { ProcedureOptions, WorkSpaceOptions } from '../workspace.ts'
import { deleteStackNodes } from './delete-stack.ts'
import { deployStackNodes } from './deploy-stack.ts'

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
	// First hydrate the resources that we won't deploy

	for (const stack of filteredOutStacks) {
		graph.add(stack.urn, [], async () => {
			const stackState = appState.stacks[stack.urn]

			if (stackState) {
				for (const node of stack.nodes) {
					const nodeState = stackState.nodes[node.$.urn]
					if (nodeState && nodeState.output) {
						debug('hydrate', node.$.urn)
						node.$.resolve(nodeState.output)
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
				const nodes = stack.nodes

				// -------------------------------------------------------------------

				const stackState = (appState.stacks[stack.urn] =
					appState.stacks[stack.urn] ??
					({
						name: stack.name,
						dependencies: [],
						nodes: {},
					} satisfies StackState))

				// -------------------------------------------------------------------
				// Find resources that need to be deleted...

				const deleteResourcesBefore: Record<URN, NodeState> = {}
				const deleteResourcesAfter: Record<URN, NodeState> = {}

				for (const [urn, state] of entries(stackState.nodes)) {
					const resource = nodes.find(r => r.$.urn === urn)

					if (!resource) {
						if (state.lifecycle?.deleteAfterCreate) {
							deleteResourcesAfter[urn] = state
						} else {
							deleteResourcesBefore[urn] = state
						}
					}
				}

				// -------------------------------------------------------------------
				// Delete resources before deployment...

				if (Object.keys(deleteResourcesBefore).length > 0) {
					await deleteStackNodes(stackState, deleteResourcesBefore, appState.idempotentToken!, queue, opt)
				}

				// -------------------------------------------------------------------
				// Deploy resources...

				await deployStackNodes(
					stackState,
					nodes,
					// stack.dataSources,
					appState.idempotentToken!,
					queue,
					opt
				)

				// -------------------------------------------------------------------
				// Delete resources after deployment...

				if (Object.keys(deleteResourcesAfter).length > 0) {
					await deleteStackNodes(stackState, deleteResourcesAfter, appState.idempotentToken!, queue, opt)
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
				await deleteStackNodes(stackState, stackState.nodes, appState.idempotentToken!, queue, opt)

				delete appState.stacks[urn]
			})
		}
	}

	// -------------------------------------------------------------------

	const errors = await graph.run()

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

	return appState
}
