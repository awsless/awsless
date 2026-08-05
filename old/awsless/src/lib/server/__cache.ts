import { Cluster, command, CommandOptions } from '@awsless/redis'
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

type Callback = (client: Cluster) => unknown

export interface CacheResources {}

export const Cache: CacheResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const { host, port } = getCacheProps(name, stack)

		const call = (opts: Omit<CommandOptions, 'cluster'> | Callback, fn: Callback) => {
			const overload = typeof opts === 'function'
			const options = overload ? {} : opts
			const callback = overload ? opts : fn

			return command(
				{
					host,
					port,
					db: 0,
					cluster: true,
					tls: {
						checkServerIdentity: (/*host, cert*/) => {
							// skip certificate hostname validation
							return undefined
						},
					},
					...options,
				},
				callback
			)
		}

		call.host = host
		call.port = port

		return call
	})
})
