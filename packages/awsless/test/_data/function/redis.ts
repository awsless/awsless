import { getCacheProps } from "../../../src/node/resource";
import { command } from '../../../../redis/src/index'

const props = getCacheProps('cache')

export default async () => {

	console.log(props);

	// await command(props, async (redis) => {

	// 	// await redis.set('test', 'LOL')

	// 	const value = await redis.get('test')

	// 	console.log(value);

	// 	return value
	// })

	await command(props, async (redis) => {

		// await redis.set('test', 'LOL')

		const value1 = await redis.get('test')
		const value2 = await redis.get('test')

		// console.log(value);

		// return value
	})
}
