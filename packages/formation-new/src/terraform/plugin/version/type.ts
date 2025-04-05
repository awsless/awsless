import type { Property } from '../schema.ts'

export type State = Record<string, unknown>

export type Plugin = Readonly<{
	schema: () => {
		provider: Property
		resources: Record<string, Property>
		dataSources: Record<string, Property>
	}
	stop: () => Promise<void>
	configure: (config: State) => Promise<void>
	readResource: (type: string, state: State) => Promise<State>
	readDataSource: (type: string, state: State) => Promise<State>
	validateResource: (type: string, state: State) => Promise<void>
	applyResourceChange: (type: string, priorState: State | null, proposedNewState: State | null) => Promise<State>
}>
