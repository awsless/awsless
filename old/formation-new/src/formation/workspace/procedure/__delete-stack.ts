import type { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { URN } from '../../urn.ts'
import { ConcurrencyQueue } from '../concurrency.ts'
import { DependencyGraph, dependentsOn } from '../dependency.ts'
import { entries } from '../entries.ts'
import { StackError } from '../error.ts'
import { NodeState, StackState } from '../state.ts'
import { WorkSpaceOptions } from '../workspace.ts'
import { deleteResource } from './delete-resource.ts'

const debug = createDebugger('Delete Stack')

export const deleteStackNodes = async (
	stackState: StackState,
	nodeStates: Record<URN, NodeState>,
	appToken: UUID,
	queue: ConcurrencyQueue,
	options: WorkSpaceOptions
) => {
	debug(stackState.name, 'start')

	// -------------------------------------------------------------------
	// Delete resources...

	const graph = new DependencyGraph()

	for (const [urn, state] of entries(nodeStates)) {
		graph.add(urn, dependentsOn(stackState.nodes, urn), async () => {
			if (state.tag === 'resource') {
				await queue(() => deleteResource(appToken, urn, state, options))
			}

			// -------------------------------------------------------------------
			// Delete the resource from the stack state

			delete stackState.nodes[urn]
		})
	}

	const errors = await graph.run()

	debug(stackState.name, 'done')

	// -------------------------------------------------------------------
	// Save changed AppState

	if (errors.length > 0) {
		throw new StackError(stackState.name, [...new Set(errors)], 'Deleting resources failed.')
	}
}
