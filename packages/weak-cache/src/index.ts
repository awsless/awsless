type Item<Value> = {
	value: Value
}

export class WeakCache<Key extends string | number | symbol, Value extends unknown> {
	private registry: FinalizationRegistry<Key>
	private cache: Map<Key, WeakRef<Item<Value>>>

	constructor() {
		this.cache = new Map()
		this.registry = new FinalizationRegistry(key => {
			this.cache.delete(key)
		})
	}

	set(key: Key, value: Value) {
		const item: Item<Value> = { value }
		const ref = new WeakRef(item)

		this.cache.set(key, ref)
		this.registry.register(item, key, ref)

		return this
	}

	get(key: Key): Value | undefined
	get(key: Key, defaultValue: Value): Value
	get(key: Key, defaultValue?: Value): Value | undefined {
		const ref = this.cache.get(key)
		if (ref) {
			const item = ref.deref()

			if (typeof item !== 'undefined') {
				return item.value
			}
		}

		return defaultValue
	}

	has(key: Key) {
		return typeof this.get(key) !== 'undefined'
	}

	delete(key: Key) {
		const ref = this.cache.get(key)

		if (ref) {
			this.cache.delete(key)
			this.registry.unregister(ref)

			return true
		}

		return false
	}

	clear() {
		for (const key of this.keys()) {
			this.delete(key)
		}
	}

	get size() {
		return this.cache.size
	}

	[Symbol.iterator]() {
		return this.entries()
	}

	keys(): IterableIterator<Key> {
		return this.cache.keys()
	}

	*values(): IterableIterator<Value> {
		for (const ref of this.cache.values()) {
			const item = ref.deref()

			if (item) {
				yield item.value
			}
		}
	}

	*entries(): IterableIterator<[Key, Value]> {
		for (const [key, ref] of this.cache.entries()) {
			const item = ref.deref()

			if (item) {
				yield [key, item.value]
			}
		}
	}
}
