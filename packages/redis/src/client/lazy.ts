import { RedisClient } from '../type'

export const createLazyClient = (cb: () => RedisClient): RedisClient => {
	let client: RedisClient | undefined
	const redis = () => {
		if (!client) {
			client = cb()
		}

		return client
	}

	return {
		send(name, args) {
			return redis().send(name, args)
		},
		batch(commands) {
			return redis().batch(commands)
		},
		transact(commands) {
			return redis().transact(commands)
		},
		async destroy() {
			await client?.destroy()
		},
	}
}
