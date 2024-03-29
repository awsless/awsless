import { URN } from '../../../resource/resource'
import { AppState, StateProvider as Provider } from '../../../resource/state'

export class StateProvider implements Provider {
	async lock(urn: URN) {
		console.log('LOCK', urn)
		return async () => {
			console.log('UNLOCK', urn)
		}
	}

	async get(urn: URN) {
		console.log('LOAD APP STATE', urn)

		return {}
	}

	async update(urn: URN, state: AppState) {
		console.log('UPDATE APP STATE', urn, state)
	}

	async delete(urn: URN) {
		console.log('DELETE APP STATE', urn)
	}
}
