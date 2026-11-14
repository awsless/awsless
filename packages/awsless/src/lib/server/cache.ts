import { getContext } from '@awsless/lambda'
import { createIoRedisClient, createLazyClient, type RedisClient, type RedisCommand } from '@awsless/redis'
import { trace } from '@awsless/utils'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { registerTestCleanup } from '../test/cleanup.js'
import { getStack, IS_LOCAL, isTest } from './util.js'

export const getCacheProps = (name: string, stack: string = getStack()) => {
	const prefix = `CACHE_${constantCase(stack)}_${constantCase(name)}`

	return {
		host: process.env[`${prefix}_HOST`]!,
		port: parseInt(process.env[`${prefix}_PORT`]!, 10),
	} as const
}

export type CacheClientOptions = {
	// Keeps the connection open for the container's life instead of closing it
	// when the invocation that first used it ends: opening one (tls, then the
	// cluster's slots and nodes) costs far more than a command.
	keepConnection?: boolean
}

// The command names of a batch, like "get,incrby": never their keys or values.
const formatCommandNames = (commands: RedisCommand[]) => {
	return [...new Set(commands.map(command => command.name.toLowerCase()))].join(',')
}

// A span per command, batch and transaction, named by the cache and the
// command alone: keys and values stay out of the trace.
const traceClient = (cache: string, raw: RedisClient): RedisClient => ({
	send: (name, args, options) =>
		trace('Redis', () => raw.send(name, args, options), {
			namespace: 'remote',
			annotations: { redis_command: name.toLowerCase() },
			metadata: { cache },
		}),
	batch: commands =>
		trace('Redis', () => raw.batch(commands), {
			namespace: 'remote',
			annotations: { redis_command: 'batch' },
			metadata: { cache, commands: commands.length, command_names: formatCommandNames(commands) },
		}),
	transact: commands =>
		trace('Redis', () => raw.transact(commands), {
			namespace: 'remote',
			annotations: { redis_command: 'transaction' },
			metadata: { cache, commands: commands.length, command_names: formatCommandNames(commands) },
		}),
	destroy: () => raw.destroy(),
})

export interface CacheResources {}

export const Cache: CacheResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return (db: number = 0, { keepConnection = false }: CacheClientOptions = {}) => {
			return traceClient(
				`${stack}.${name}`,
				createLazyClient(() => {
					const client = createIoRedisClient({
						...getCacheProps(name, stack),
						db,
						// The local dev cache is a plain single node without tls.
						...(IS_LOCAL
							? {
									cluster: false,
									tls: undefined,
								}
							: {
									cluster: true,
									tls: {
										// Cluster nodes present the cluster certificate, which
										// never matches the individual node hostnames.
										checkServerIdentity: () => undefined,
									},
								}),
					})

					// Tests call handlers without a lambda context, so the client
					// cleans up when the test file finishes. Otherwise the invocation
					// that first uses the client owns its cleanup, unless the caller
					// keeps the connection; a module scope client is shared by every
					// invocation and every internal call in between, so it must not
					// be torn down for each of them.
					if (isTest()) {
						registerTestCleanup(() => client.destroy())
					} else if (!keepConnection) {
						getContext().onFinally(() => client.destroy())
					}

					return client
				})
			)
		}
	})
})
