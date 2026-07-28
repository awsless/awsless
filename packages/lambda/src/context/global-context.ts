import { AsyncLocalStorage } from 'node:async_hooks'

export class GlobalContext<T> {
	#storage = new AsyncLocalStorage<T>()

	async run<R>(store: T, callback: () => R) {
		return this.#storage.run(store, callback)
	}

	get() {
		return this.#storage.getStore()
	}
}
