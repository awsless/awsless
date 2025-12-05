import { AsyncLocalStorage } from 'node:async_hooks'

export class AsyncContext<T> {
	#storage: AsyncLocalStorage<T>

	constructor() {
		this.#storage = new AsyncLocalStorage<T>()
	}

	run<R>(store: T, callback: () => R) {
		return this.#storage.run(store, callback)
	}

	get() {
		return this.#storage.getStore()
	}
}
