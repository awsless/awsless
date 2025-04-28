import { AppState } from '../state.ts'
import { AppStateV0 } from './v0.ts'
import { v1 } from './v1.ts'

const versions = [[1, v1]] as const

export const migrateAppState = (oldState: AppStateV0 | AppState): AppState => {
	let version = ('version' in oldState && oldState.version) || 0

	for (const [v, migrate] of versions) {
		if (v > version) {
			oldState = migrate(oldState as any)
		}
	}

	return oldState as AppState
}
