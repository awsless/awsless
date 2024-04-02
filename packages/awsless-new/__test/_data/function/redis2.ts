import { Cache } from '../../../old/index.js'

export default async () => {
	const lol = await Cache.cache.cache(async redis => {
		return 1
	})
}
