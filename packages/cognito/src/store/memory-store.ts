import { Store, StoreData } from './store'

export class MemoryStore implements Store {
	private data: Record<string, unknown> = {}

	hydrate(data: StoreData) {
		this.data = data
		return this
	}

	get<T>(key: string) {
		return this.data[key] as T | undefined
	}

	set(key: string, value: unknown) {
		this.data[key] = value
		return this
	}

	remove(key: string) {
		delete this.data[key]
		return this
	}
}
