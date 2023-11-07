import { Store, StoreData } from './store'

const supported = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

export class LocalStore implements Store {
	private serverSideData: StoreData = {}

	hydrate(serverSideData: StoreData) {
		this.serverSideData = serverSideData
		return this
	}

	get<T>(key: string) {
		const value = supported ? localStorage.getItem(key) : this.serverSideData[key]

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
		const json = JSON.stringify(value)

		if (supported) {
			try {
				localStorage.setItem(key, json)
			} catch (error) {
				// storing something in localstorage can fail.
			}
		} else {
			this.serverSideData[key] = json
		}

		return this
	}

	remove(key: string) {
		if (supported) {
			localStorage.removeItem(key)
		} else {
			delete this.serverSideData[key]
		}

		return this
	}
}
