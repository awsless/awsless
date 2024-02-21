import { Store, StoreData } from './store'

const supported = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

export class LocalStore implements Store {
	private serverSideData: StoreData = {}

	constructor(private prefix = '') {}

	hydrate(serverSideData: StoreData) {
		this.serverSideData = serverSideData

		return this
	}

	get<T>(key: string) {
		const name = this.prefix + key
		const value = supported ? localStorage.getItem(name) : this.serverSideData[name]

		if (typeof value === 'undefined' || value === null) {
			return
		}

		try {
			return JSON.parse(value) as T
		} catch (error) {
			return value as T
		}
	}

	set(key: string, value: unknown) {
		const name = this.prefix + key
		const json = JSON.stringify(value)

		if (supported) {
			try {
				localStorage.setItem(name, json)
			} catch (error) {
				// storing something in localstorage can fail.
			}
		} else {
			this.serverSideData[name] = json
		}

		return this
	}

	remove(key: string) {
		const name = this.prefix + key

		if (supported) {
			localStorage.removeItem(name)
		} else {
			delete this.serverSideData[name]
		}

		return this
	}
}
