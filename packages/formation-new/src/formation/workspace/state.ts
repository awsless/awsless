import { UUID } from 'node:crypto'
import { State } from '../meta.ts'
import { URN } from '../urn.ts'

export type AppState = {
	name: string
	version?: number
	idempotentToken?: UUID
	stacks: Record<URN, StackState>
}

export type StackState = {
	name: string
	dependencies: URN[]
	nodes: Record<URN, NodeState>
	// resources: Record<URN, ResourceState>
}

export type NodeState = {
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
		// createBeforeDelete?: boolean;
	}
	//   policies: {
	//     deletion: ResourceDeletionPolicy;
	//   };
}

export const compareState = (left: State, right: State) => {
	// order the object keys so that the comparison works.
	const replacer = (_: unknown, value: unknown) => {
		if (value !== null && value instanceof Object && !Array.isArray(value)) {
			return Object.keys(value)
				.sort()
				.reduce((sorted: Record<string, unknown>, key) => {
					sorted[key] = value[key as keyof typeof value]
					return sorted
				}, {})
		}
		return value
	}

	const l = JSON.stringify(left, replacer)
	const r = JSON.stringify(right, replacer)

	return l === r
}
