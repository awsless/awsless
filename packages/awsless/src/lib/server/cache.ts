import { Context, getContext } from '@awsless/lambda'
import { createIoRedisClient, createLazyClient, RedisClient } from '@awsless/redis'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { registerTestCleanup } from '../test/cleanup.js'
import { getStack, IS_LOCAL, isTest } from './util.js'

const tryGetContext = () => {
	try {
		return getContext()
	} catch {
		return undefined
	}
}

export const getCacheProps = (name: string, stack: string = getStack()) => {
	const prefix = `CACHE_${constantCase(stack)}_${constantCase(name)}`

	return {
		host: process.env[`${prefix}_HOST`]!,
		port: parseInt(process.env[`${prefix}_PORT`]!, 10),
	} as const
}

// The connection closes with each invocation that used it, so a module
// scope client must register anew; processes without an invocation keep it.
const destroyPerInvocation = (client: RedisClient): RedisClient => {
	const registered = new WeakSet<Context>()

	const track = () => {
		const context = tryGetContext()

		if (context && !registered.has(context)) {
			registered.add(context)
			context.onFinally(() => client.destroy())
		}
	}

	return {
		send(name, args, options) {
			track()
			return client.send(name, args, options)
		},
		batch(commands) {
			track()
			return client.batch(commands)
		},
		transact(commands) {
			track()
			return client.transact(commands)
		},
		destroy() {
			return client.destroy()
		},
	}
}

export interface CacheResources {}

export const Cache: CacheResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return (db: number = 0) => {
			const client = createLazyClient(() => {
				return createIoRedisClient({
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
			})

			// Tests call handlers without a lambda context, so the
			// client cleans up when the test file finishes.
			if (isTest()) {
				registerTestCleanup(() => client.destroy())
				return client
			}

			return destroyPerInvocation(client)
		}
	})
})
