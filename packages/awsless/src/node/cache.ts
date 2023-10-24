import { constantCase } from "change-case"
import { STACK } from './resource.js'
import { createProxy } from './util.js'

export const getCacheProps = (name: string, stack:string = STACK) => {
	const prefix = `CACHE_${constantCase(stack)}_${constantCase(name)}`

	return {
		host: process.env[`${prefix}_HOST`]!,
		port: parseInt(process.env[`${prefix}_PORT`]!, 10),
	} as const
}

export interface CacheResources {}

export const Cache:CacheResources = /*@__PURE__*/ createProxy((stack) => {
	return createProxy((name) => {
		const call = () => {
			// should provide a redis client.
		}

		const { host, port } = getCacheProps(name, stack)
		call.host = host
		call.port = port

		return call
	})
})
