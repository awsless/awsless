import type { UUID } from 'node:crypto'
import { URN } from '../../resource.ts'
import { ConcurrencyQueue } from '../concurrency.ts'
import { DependencyGraph, dependentsOn } from '../dependency.ts'
import { entries } from '../entries.ts'
import { ResourceError, StackError } from '../error.ts'
import { ResourceState, StackState } from '../state.ts'
import { WorkSpaceOptions } from '../workspace.ts'
import { deleteResource } from './delete-resource.ts'

export const deleteStackResources = async (
	stackState: StackState,
	resourceStates: Record<URN, ResourceState>,
	appToken: UUID,
	queue: ConcurrencyQueue,
	options: WorkSpaceOptions
) => {
	// -------------------------------------------------------------------
	// Delete resources...

	const graph = new DependencyGraph()

	for (const [urn, state] of entries(resourceStates)) {
		graph.add(urn, dependentsOn(stackState.resources, urn), async () => {
			await queue(() => deleteResource(appToken, urn, state, options))

			// -------------------------------------------------------------------
			// Delete the resource from the stack state

			delete stackState.resources[urn]
		})
	}

	const results = await graph.run()

	// -------------------------------------------------------------------
	// Save changed AppState

	const errors: ResourceError[] = results
		.filter(r => r.status === 'rejected')
		.map(r => (r as PromiseRejectedResult).reason)

	if (errors.length > 0) {
		throw new StackError(stackState.name, [...new Set(errors)], 'Deleting resources failed.')
	}
}
