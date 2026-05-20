import { type RedisOptions, Cluster, Redis } from 'ioredis'
import { RedisClient } from '../type'

export type IoRedisOptions = RedisOptions & { cluster?: boolean }
// type Client<O extends CommandOptions> = O['cluster'] extends true ? Cluster : Redis

let optionOverrides: IoRedisOptions = {}
export const overrideOptions = (options: IoRedisOptions) => {
	optionOverrides = options
}

export const createIoRedisClient = (options: IoRedisOptions): RedisClient => {
	const createClient = () => {
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
			return new Redis(props)
		} else {
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
			)
		}
	}

	let redis: Redis | Cluster | undefined

	const getLazyClient = () => {
		if (!redis) {
			redis = createClient()
		}

		return redis
	}

	return {
		send: (name, args) => {
			return getLazyClient().call(
				name,
				args.filter(a => typeof a !== 'undefined')
			) as any
		},
		batch: commands => {
			const pipe = getLazyClient().pipeline()
			for (const command of commands) {
				pipe.call(
					command.name,
					command.args.filter(a => typeof a !== 'undefined')
				)
			}

			return pipe.exec() as any
		},
		transact: commands => {
			const pipe = getLazyClient().multi()
			for (const command of commands) {
				pipe.call(
					command.name,
					command.args.filter(a => typeof a !== 'undefined')
				)
			}

			return pipe.exec() as any
		},
		async destroy() {
			if (redis) {
				const promise = redis.quit()
				redis = undefined
				await promise
			}
		},
	}
}
