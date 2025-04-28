import { App } from '../../app.ts'
import { concurrencyQueue } from '../concurrency.ts'
import { DependencyGraph, dependentsOn } from '../dependency.ts'
import { entries } from '../entries.ts'
import { AppError } from '../error.ts'
import { migrateAppState } from '../state/migrate.ts'
import { ProcedureOptions, WorkSpaceOptions } from '../workspace.ts'
import { deleteStackNodes } from './delete-stack.ts'

export const deleteApp = async (app: App, opt: WorkSpaceOptions & ProcedureOptions) => {
	const latestState = await opt.backend.state.get(app.urn)

	if (!latestState) {
		throw new AppError(app.name, [], `App already deleted: ${app.name}`)
	}

	// -------------------------------------------------------
	// Migrate the state file to the latest version

	const appState = migrateAppState(latestState)

	// -------------------------------------------------------
	// Set the idempotent token when no token exists.

	if (opt.idempotentToken || !appState.idempotentToken) {
		appState.idempotentToken = opt.idempotentToken ?? crypto.randomUUID()

		await opt.backend.state.update(app.urn, appState)
	}

	// -------------------------------------------------------
	// Filter stacks

	let stacks = entries(appState.stacks)

	if (opt.filters && opt.filters.length > 0) {
		stacks = stacks.filter(([_, stack]) => opt.filters!.includes(stack.name))
	}

	// -------------------------------------------------------

	const queue = concurrencyQueue(opt.concurrency ?? 10)
	const graph = new DependencyGraph()

	for (const [urn, stackState] of stacks) {
		graph.add(urn, dependentsOn(appState.stacks, urn), async () => {
			await deleteStackNodes(stackState, stackState.nodes, appState.idempotentToken!, queue, opt)
			delete appState.stacks[urn]
		})
	}

	const errors = await graph.run()

	// -------------------------------------------------------
	// Remove the idempotent token

	delete appState.idempotentToken

	// -------------------------------------------------------
	// Save state

	await opt.backend.state.update(app.urn, appState)

	// -------------------------------------------------------
	if (errors.length > 0) {
		throw new AppError(app.name, [...new Set(errors)], 'Deleting app failed.')
	}

	// -------------------------------------------------------
	// If no errors happened we can savely delete the app
	// state when all the stacks have been deleted.

	if (Object.keys(appState.stacks).length === 0) {
		await opt.backend.state.delete(app.urn)
	}
}
