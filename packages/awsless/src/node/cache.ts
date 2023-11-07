import { constantCase } from 'change-case'
import { STACK } from './resource.js'
import { createProxy } from './util.js'
import { command, Cluster, CommandOptions } from '@awsless/redis'

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
