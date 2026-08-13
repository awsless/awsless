import { URN } from '../urn.ts'
import { AppState } from '../workspace/state.ts'

export type StateBackend = {
	get(urn: URN): Promise<AppState | undefined>
	update(urn: URN, state: AppState): Promise<void>
	delete(urn: URN): Promise<void>
}
