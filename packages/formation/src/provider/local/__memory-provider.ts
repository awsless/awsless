import { URN } from '../../core/resource'
import { AppState, StateProvider } from '../../core/state'

export class MemoryProvider implements StateProvider {
	protected locked = new Map<URN, number>()
	protected states = new Map<URN, AppState>()

	async lock(urn: URN) {
		if (this.locked.has(urn)) {
			throw new Error('Already locked')
		}

		const id = Math.random()
		this.locked.set(urn, id)

		return async () => {
			if (this.locked.get(urn) === id) {
				this.locked.delete(urn)
			}
		}
	}

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
