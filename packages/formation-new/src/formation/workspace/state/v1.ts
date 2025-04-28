import { URN } from '../../urn.ts'
import { entries } from '../entries.ts'
import { AppState, NodeState, StackState } from '../state.ts'
import { AppStateV0 } from './v0.ts'

export const v1 = (oldAppState: AppStateV0): AppState => {
	const stacks: Record<URN, StackState> = {}

	for (const [urn, stack] of entries(oldAppState.stacks)) {
		const nodes: Record<URN, NodeState> = {}

		for (const [urn, resource] of entries(stack.resources)) {
			nodes[urn] = {
				...resource,
				tag: 'resource',
			}
		}

		stacks[urn] = {
			name: stack.name,
			dependencies: stack.dependencies,
			nodes,
		}
	}

	return {
		...oldAppState,
		stacks,
		version: 1,
	}
}
