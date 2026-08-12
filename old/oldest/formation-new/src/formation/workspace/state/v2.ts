import { URN } from '../../urn.ts'
import { entries } from '../entries.ts'
import { AppState, StackState } from '../state.ts'
import { AppStateV1 } from './v1.ts'

export const v2 = (oldAppState: AppStateV1): AppState => {
	const stacks: Record<URN, StackState> = {}

	for (const [urn, stack] of entries(oldAppState.stacks)) {
		stacks[urn] = {
			name: stack.name,
			nodes: stack.nodes,
		}
	}

	return {
		...oldAppState,
		stacks,
		version: 2,
	}
}
