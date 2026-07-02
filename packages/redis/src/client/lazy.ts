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
		send(name, args, options) {
			return redis().send(name, args, options)
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
