import { GetParametersCommand } from '@aws-sdk/client-ssm'
import chunk from 'chunk'
import { ssmClient } from './client'
import { Options, Output, Paths } from './types'

const formatPath = (path: string) => {
	return path[0] !== '/' ? `/${path}` : path
}

const cache: Record<string, { value: string; ttl: number }> = {}

/** Fetch the provided ssm paths */
export const ssm = async <T extends Paths>(
	paths: T,
	{ client = ssmClient(), ttl = 0 }: Options = {}
): Promise<Output<T>> => {
	const now = Math.floor(Date.now() / 1000)
	const values: Record<string, unknown> = {}

	const list = Object.entries(paths)
		.map(([key, path]) => {
			if (typeof path === 'string') {
				return {
					key,
					path: formatPath(path),
					transform: (v: string) => v,
				}
			}

			return {
				key,
				path: formatPath(path.path),
				transform: path.transform,
			}
		})
		.filter(({ key, path, transform }) => {
			const item = cache[path]

			if (item && item.ttl > now) {
				values[key] = transform(cache[path].value)
				return false
			}

			return true
		})

	await Promise.all(
		chunk(list, 10).map(async list => {
			const names = [...new Set(list.map(item => item.path))]
			const command = new GetParametersCommand({
				Names: names,
				WithDecryption: true,
			})

			const result = await client.send(command)

			if (result.InvalidParameters && result.InvalidParameters.length) {
				throw new Error(`SSM parameter(s) not found - ['${result.InvalidParameters.join(`', '`)}']`)
			}

			result.Parameters?.forEach(({ Name: path, Value: value }) => {
				if (typeof value === 'string' && typeof path === 'string') {
					if (ttl > 0) {
						cache[path] = { value, ttl: now + ttl }
					}

					list.forEach(item => {
						if (path === item.path) {
							values[item.key] = item.transform(value)
						}
					})
				}
			})
		})
	)

	return values as Output<T>
}
