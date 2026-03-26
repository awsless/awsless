import type { RedisOptions } from 'ioredis'
import { Cluster, Redis } from 'ioredis'

export type CommandOptions<Cluster extends boolean = boolean> = RedisOptions & { cluster?: Cluster }
export type Client<O extends CommandOptions> = O['cluster'] extends true ? Cluster : Redis

let optionOverrides: CommandOptions = {}
export const overrideOptions = (options: CommandOptions) => {
	optionOverrides = options
}

export const redisClient = <O extends CommandOptions>(options: O): Client<O> => {
	const props = {
		tls: {},
		lazyConnect: true,
		stringNumbers: true,
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: 3,
		autoResubscribe: false,
		autoResendUnfulfilledCommands: false,
		connectTimeout: 5000,
		commandTimeout: 5000,

		// commandQueue: false,
		// offlineQueue: false,

		...options,
		...optionOverrides,
	}

	if (!props.cluster) {
		return new Redis(props) as Client<O>
	}

	return new Cluster(
		[
			{
				host: props.host,
				port: props.port,
			},
		],
		{
			dnsLookup: (address, callback) => callback(null, address),
			slotsRefreshTimeout: 5000,
			enableReadyCheck: false,
			clusterRetryStrategy(times) {
				if (times > 5) return null
				return Math.min(times * 200, 2000)
			},
			redisOptions: props,
		}
	) as Client<O>
}
