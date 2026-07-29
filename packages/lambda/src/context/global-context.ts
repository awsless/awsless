export class GlobalContext<T> {
	#store: T | undefined

	async run<R>(store: T, callback: () => R) {
		this.#store = store
		try {
			const res = await callback()
			return res
		} finally {
			this.#store = undefined
		}
	}

	get() {
		return this.#store
	}
}
