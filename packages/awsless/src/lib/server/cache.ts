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
		// One client per database for the container's life, whoever asks for it:
		// opening a connection (tls, then the cluster's slots and nodes) costs
		// far more than a command, so it's never closed between invocations.
		const clients = new Map<number, RedisClient>()

		const createClient = (db: number) => {
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

					// An open connection keeps a test file from finishing.
					if (isTest()) {
						registerTestCleanup(() => client.destroy())
					}

					return client
				})
			)
		}

		return (db: number = 0) => {
			let client = clients.get(db)

			if (!client) {
				client = createClient(db)
				clients.set(db, client)
			}

			return client
		}
	})
})
