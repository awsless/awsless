import { Cache } from '../../../src/index.js'

export default async () => {
	const lol = await Cache.cache.cache(redis => {
		return 1
	})
}
