import { type RedisOptions, Cluster, Command as IoRedisCommand, Redis } from 'ioredis'
import { type InputValue, type RedisClient, type RedisCommandOptions } from '../type'

export type IoRedisOptions = RedisOptions & { cluster?: boolean }
// type Client<O extends CommandOptions> = O['cluster'] extends true ? Cluster : Redis

type IoRedisCommandExecutor = {
	options: {
		keyPrefix?: string
		showFriendlyErrorStack?: boolean
	}
	sendCommand(command: IoRedisCommand): unknown
}

type IoRedisPipeline = IoRedisCommandExecutor & {
	exec(): unknown
}

const filterArgs = (args: (InputValue | undefined)[]) => {
	return args.filter((arg): arg is InputValue => typeof arg !== 'undefined')
}

const createCommand = (
	redis: IoRedisCommandExecutor,
	name: string,
	args: (InputValue | undefined)[],
	options?: RedisCommandOptions
) => {
	return new IoRedisCommand(name, filterArgs(args), {
		errorStack: redis.options.showFriendlyErrorStack ? new Error() : undefined,
		keyPrefix: redis.options.keyPrefix,
		readOnly: options?.readonly,
		replyEncoding: 'utf8',
	})
}

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

			reconnectOnError(err: Error) {
				// After an ElastiCache failover the old primary is demoted to a
				// replica; the open socket must be dropped to re-resolve DNS.
				return err.message.includes('READONLY') ? 2 : false
			},

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
		send: (name, args, options) => {
			const redis = getLazyClient()
			return redis.sendCommand(createCommand(redis, name, args, options)) as any
		},
		batch: commands => {
			const pipe = getLazyClient().pipeline() as unknown as IoRedisPipeline
			for (const command of commands) {
				pipe.sendCommand(createCommand(pipe, command.name, command.args, command.options))
			}

			return pipe.exec() as any
		},
		transact: commands => {
			const pipe = getLazyClient().multi() as unknown as IoRedisPipeline
			for (const command of commands) {
				pipe.sendCommand(createCommand(pipe, command.name, command.args, command.options))
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
