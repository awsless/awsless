import { UUID } from 'node:crypto'
import { State } from '../../meta.ts'
import { URN } from '../../urn.ts'
import { entries } from '../entries.ts'
import { AppStateV0 } from './v0.ts'

export type AppStateV1 = {
	name: string
	version?: number
	idempotentToken?: UUID
	stacks: Record<
		URN,
		{
			name: string
			dependencies: URN[]
			nodes: Record<
				URN,
				{
					// id?: string;
					tag: 'resource' | 'data'
					type: string
					version?: number
					provider: string
					input: State
					output: State
					dependencies: URN[]
					lifecycle?: {
						retainOnDelete?: boolean
						deleteAfterCreate?: boolean
					}
				}
			>
		}
	>
}

export const v1 = (oldAppState: AppStateV0): AppStateV1 => {
	const stacks: Record<URN, AppStateV1['stacks'][URN]> = {}

	for (const [urn, stack] of entries(oldAppState.stacks)) {
		const nodes: Record<URN, AppStateV1['stacks'][URN]['nodes'][URN]> = {}

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
