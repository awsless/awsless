import { Store, StoreData } from './store'
import cookie from 'js-cookie'

const browser = typeof window !== 'undefined'

export class CookieStore implements Store {
	private serverSideData: StoreData = {}

	hydrate(serverSideData: StoreData) {
		this.serverSideData = serverSideData
		return this
	}

	get<T>(key: string) {
		const value = browser ? cookie.get(key) : this.serverSideData[key]

		if (typeof value === 'undefined') {
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

		if (browser) {
			cookie.set(key, json, {
				secure: location.hostname !== 'localhost',
				expires: 3650,
				sameSite: 'strict',
			})
		} else {
			this.serverSideData[key] = json
		}

		return this
	}

	remove(key: string) {
		if (browser) {
			cookie.remove(key)
		} else {
			delete this.serverSideData[key]
		}

		return this
	}
}
