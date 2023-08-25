import { getCacheProps } from "../../../src/node/resource"
// import { command } from '../../../../redis/src/index'
import { createCluster } from 'redis'

const props = getCacheProps('cache')

export default async () => {

	console.log(props);

	const client = createCluster({
		rootNodes: [{
			// url: `redis://test.23ejan.clustercfg.memorydb.eu-west-1.amazonaws.com:6379/0`,
			url: `redis://${props.host}:${props.port}/0`
		}],
		defaults: {
			disableOfflineQueue: true,
			socket: {
				connectTimeout: 1000,
				timeout: 1000,
			},
		},
		maxCommandRedirections: 3,
		minimizeConnections: true,
		useReplicas: true,
	})

	await client.connect()

	await client.set('test', 'Hello')

	const value = await client.get('test')

	console.log(value);

	await client.quit()

	return value


	// await command({
	// 	host: 'test.23ejan.clustercfg.memorydb.eu-west-1.amazonaws.com',
	// 	port: 6379,
	// }, async (redis) => {

	// 	// await redis.set('test', 'LOL')

	// 	const value = await redis.get('test')

	// 	console.log(value);

	// 	return value
	// })

	// await command(props, async (redis) => {

	// 	// await redis.set('test', 'LOL')

	// 	const value1 = await redis.get('test')
	// 	// const value2 = await redis.get('test')

	// 	console.log(value1);

	// 	// return value
	// })
}
