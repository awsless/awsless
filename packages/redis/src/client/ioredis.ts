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
		const merged = {
			tls: {},
			lazyConnect: true,
			stringNumbers: true,
			keepAlive: 30000,
			noDelay: true,
			enableReadyCheck: false,
			maxRetriesPerRequest: 3,
			autoResubscribe: false,
			autoResendUnfulfilledCommands: true,
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

		// commandTimeout only rejects the promise and leaves a dead socket open.
		// Shorter connect/socket timeouts tear it down in time to reconnect and retry.
		const defaultIoTimeout =
			typeof merged.commandTimeout === 'number' && merged.commandTimeout > 0
				? Math.max(1, Math.floor(merged.commandTimeout / 2))
				: 5000

		const props: IoRedisOptions = {
			...merged,
			connectTimeout:
				'connectTimeout' in options || 'connectTimeout' in optionOverrides
					? merged.connectTimeout
					: defaultIoTimeout,
			socketTimeout:
				'socketTimeout' in options || 'socketTimeout' in optionOverrides
					? merged.socketTimeout
					: defaultIoTimeout,
		}

		const client = !props.cluster
			? new Redis(props)
			: new Cluster(
					[
						{
							host: props.host,
							port: props.port,
						},
					],
					{
						dnsLookup: (address, callback) => callback(null, address),
						slotsRefreshTimeout: props.commandTimeout ?? 5000,
						enableReadyCheck: false,
						clusterRetryStrategy(times) {
							if (times > 5) return null
							return Math.min(times * 200, 2000)
						},
						redisOptions: props,
					}
				)

		// The underlying ioredis instance isn't exposed to callers, so silence
		// background error events while command promises still surface failures.
		client.on('error', () => {})

		return client
	}

	let redis: Redis | Cluster | undefined

	const getLazyClient = () => {
		// An ended client never reconnects on its own, so start a fresh one.
		if (!redis || redis.status === 'end') {
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
				const current = redis
				redis = undefined
				if (current.status !== 'end') {
					await current.quit()
				}
			}
		},
	}
}
