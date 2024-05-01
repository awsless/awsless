import { URN } from '../../../core/resource'
import { LockProvider as Provider } from '../../../core/lock'

export class LockProvider implements Provider {
	protected locks = new Map<URN, number>()

	async locked(urn: URN) {
		return this.locks.has(urn)
	}

	async lock(urn: URN) {
		if (this.locks.has(urn)) {
			throw new Error('Already locked')
		}

		const id = Math.random()
		this.locks.set(urn, id)

		return async () => {
			if (this.locks.get(urn) === id) {
				this.locks.delete(urn)
			}
		}
	}
}
