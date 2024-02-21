import { Store, StoreData } from './store'
import cookie from 'js-cookie'

const browser = typeof window !== 'undefined'

export class CookieStore implements Store {
	private serverSideData: StoreData = {}

	constructor(private prefix = '') {}

	hydrate(serverSideData: StoreData) {
		this.serverSideData = serverSideData

		return this
	}

	get<T>(key: string) {
		const name = this.prefix + key
		const value = browser ? cookie.get(name) : this.serverSideData[name]

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
		const name = this.prefix + key
		const json = JSON.stringify(value)

		if (browser) {
			cookie.set(name, json, {
				secure: location.hostname !== 'localhost',
				expires: 3650,
				sameSite: 'strict',
			})
		} else {
			this.serverSideData[name] = json
		}

		return this
	}

	remove(key: string) {
		const name = this.prefix + key

		if (browser) {
			cookie.remove(name)
		} else {
			delete this.serverSideData[name]
		}

		return this
	}
}
