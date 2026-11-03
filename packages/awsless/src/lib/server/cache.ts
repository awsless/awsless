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

				// One connection for the container's life: opening one (tls, then
				// the cluster's slots and nodes) costs far more than a command, and
				// an async handler finishes with it open. Closing it after an
				// invocation made the next one connect again. Tests close it when
				// the test file finishes.
				if (isTest()) {
					registerTestCleanup(() => client.destroy())
				}

				return client
			})
		}
	})
})
