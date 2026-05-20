import { getContext } from '@awsless/lambda'
import { createIoRedisClient, createLazyClient } from '@awsless/redis'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { STACK } from './util.js'

export const getCacheProps = (name: string, stack: string = STACK) => {
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
					cluster: true,
					db,
					tls: {
						checkServerIdentity: (/*host, cert*/) => {
							// skip certificate hostname validation
							return undefined
						},
					},
				})

				getContext().onFinally(() => {
					return client.destroy()
				})

				return client
			})
		}
	})
})
