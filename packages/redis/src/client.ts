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
		lazyConnect: true,
		stringNumbers: true,
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: 3,
		autoResubscribe: false,
		commandQueue: false,
		offlineQueue: false,
		autoResendUnfulfilledCommands: false,
		connectTimeout: 1000 * 5,
		commandTimeout: 1000 * 5,
		...options,
		...optionOverrides,
	}

	// return new Redis(props) as Client<O>

	return new Cluster(
		[
			{
				host: props.host,
				port: props.port,
			},
		],
		{
			dnsLookup: (address, callback) => callback(null, address),
			enableReadyCheck: false,
			redisOptions: {
				...props,
				// username: options.username,
				// password: options.password,
				tls: {
					checkServerIdentity: (/*host, cert*/) => {
						// skip certificate hostname validation
						return undefined
					},
				},
			},
		}
	) as Client<O>
}
