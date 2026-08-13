import { URN } from '../../../core/resource'
import { AppState, StateProvider as Provider } from '../../../core/state'

export class StateProvider implements Provider {
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
