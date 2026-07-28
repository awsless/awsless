import { AsyncLocalStorage } from 'node:async_hooks'

// Backed by AsyncLocalStorage instead of a single field, because the bundle
// runs multiple routes concurrently in one lambda. With a shared field the
// first route to finish wipes the store for every route still in flight,
// which surfaces as "Lambda context is not available" in whichever handler
// happens to touch the context last.
export class GlobalContext<T> {
	#storage = new AsyncLocalStorage<T>()

	async run<R>(store: T, callback: () => R) {
		return this.#storage.run(store, callback)
	}

	get() {
		return this.#storage.getStore()
	}
}
