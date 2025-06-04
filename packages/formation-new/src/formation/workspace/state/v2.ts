import { URN } from '../../urn.ts'
import { entries } from '../entries.ts'
import { AppState, NodeState, StackState } from '../state.ts'
import { AppStateV1 } from './v1.ts'

export const v2 = (oldAppState: AppStateV1): AppState => {
	const stacks: Record<URN, StackState> = {}

	for (const [urn, stack] of entries(oldAppState.stacks)) {
		const nodes: Record<URN, NodeState> = {}

		stacks[urn] = {
			name: stack.name,
			nodes,
		}
	}

	return {
		...oldAppState,
		stacks,
		version: 2,
	}
}
