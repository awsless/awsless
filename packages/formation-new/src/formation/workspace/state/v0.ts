import { UUID } from 'node:crypto'
import { State } from '../../meta.ts'
import { URN } from '../../urn.ts'

export type AppStateV0 = {
	name: string
	idempotentToken?: UUID
	stacks: Record<
		URN,
		{
			name: string
			dependencies: URN[]
			resources: Record<
				URN,
				{
					type: string
					version?: number
					provider: string
					input: State
					output?: State
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
