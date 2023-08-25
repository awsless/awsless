import { Cluster, Redis } from 'ioredis'
import type { RedisOptions } from 'ioredis'

export type CommandOptions = RedisOptions & { cluster?: boolean }
export type Client<O extends CommandOptions> = O['cluster'] extends true ? Cluster : Redis

let optionOverrides: CommandOptions = {}
export const overrideOptions = (options: CommandOptions) => {
	optionOverrides = options
}

export const redisClient = <O extends CommandOptions>(options: O): Client<O> => {
	const props = {
		// lazyConnect: true,
		// stringNumbers: true,
		// keepAlive: 0,
		// noDelay: true,
		// enableReadyCheck: false,
		// maxRetriesPerRequest: 3,
		// autoResubscribe: false,
		// commandQueue: false,
		// offlineQueue: false,
		// autoResendUnfulfilledCommands: false,
		// connectTimeout: 1000 * 5,
		// commandTimeout: 1000 * 5,
		...options,
		...optionOverrides
	}

	// if(options.cluster === true) {
	// 	return new Cluster([{
	// 		host: props.host,
	// 		port: props.port
	// 	}], {
	// 		dnsLookup: (address, callback) => callback(null, address),
	// 		redisOptions: props,
	// 		// enableOfflineQueue: props.offlineQueue,
	// 		enableReadyCheck: props.enableReadyCheck,
	// 	}) as Client<O>
	// }

	// return new Redis(props) as Client<O>

	// return new Redis({
	// 	host: options.host,
	// 	port: options.port,
	// 	// username: options.username,
	// 	// password: options.password,
	// 	tls: {},
	// }) as Client<O>

	return new Cluster([{
		host: options.host,
		port: options.port,
	}], {
		enableReadyCheck: false,
		dnsLookup: (address, callback) => callback(null, address),
		redisOptions: {
			username: options.username,
			password: options.password,
			tls: {
				checkServerIdentity: (/*host, cert*/) => {
					// skip certificate hostname validation
					return undefined
				}
			}
		},

		// enableAutoPipelining: true,
		// enableReadyCheck: false,
		// lazyConnect: true,
		// retryDelayOnClusterDown: 0,
		// slotsRefreshInterval: 0,
		// slotsRefreshTimeout: 100,
	}) as Client<O>
}
