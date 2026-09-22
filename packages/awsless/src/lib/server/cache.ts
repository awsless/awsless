import { getContext } from '@awsless/lambda'
import { createIoRedisClient, createLazyClient } from '@awsless/redis'
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

export interface CacheResources {}

export const Cache: CacheResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return (db: number = 0) => {
			return createLazyClient(() => {
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

				// Tests call handlers without a lambda context, so the
				// client cleans up when the test file finishes. Otherwise the
				// invocation that first uses the client owns its cleanup; a
				// module scope client is shared by every invocation and every
				// internal call in between, so it must not be torn down for
				// each of them.
				if (isTest()) {
					registerTestCleanup(() => client.destroy())
				} else {
					getContext().onFinally(() => client.destroy())
				}

				return client
			})
		}
	})
})
