import { getContext } from '@awsless/lambda'
import { createIoRedisClient, createLazyClient } from '@awsless/redis'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { registerTestCleanup } from '../test/cleanup.js'
import { getStack, IS_LOCAL, IS_TEST } from './util.js'

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

export interface CacheResources {}

export const Cache: CacheResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return (db: number = 0) => {
			return createLazyClient(() => {
				const client = createIoRedisClient({
					...getCacheProps(name, stack),
					db,
					// The local dev cache runs a plain single node redis
					// without tls.
					...(IS_LOCAL
						? {
								cluster: false,
								tls: undefined,
							}
						: {
								cluster: true,
								tls: {
									checkServerIdentity: (/*host, cert*/) => {
										// skip certificate hostname validation
										return undefined
									},
								},
							}),
				})

				// Tests call handlers directly without a lambda context,
				// so the client cleans up when the test file finishes.
				if (IS_TEST) {
					registerTestCleanup(() => client.destroy())
				} else {
					// Jobs, instances & `awsless run` have no invocation
					// either - their client lives as long as the process.
					const context = tryGetContext()

					context?.onFinally(() => {
						return client.destroy()
					})
				}

				return client
			})
		}
	})
})
