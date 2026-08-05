import { URN } from '../../urn.ts'
import { LockBackend } from '../lock.ts'

export class MemoryLockBackend implements LockBackend {
	protected locks = new Map<URN, number>()

	async insecureReleaseLock(urn: URN) {
		this.locks.delete(urn)
	}

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

	clear() {
		this.locks.clear()
	}
}
