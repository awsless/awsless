import { URN } from '../../resource.ts'
import { AppState } from '../../workspace/state.ts'
import { StateBackend } from '../state.ts'

export class MemoryStateBackend implements StateBackend {
	protected states = new Map<URN, AppState>()

	async get(urn: URN) {
		return this.states.get(urn)
	}

	async update(urn: URN, state: AppState) {
		this.states.set(urn, state)
	}

	async delete(urn: URN) {
		this.states.delete(urn)
	}
}
