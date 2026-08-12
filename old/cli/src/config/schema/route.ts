import { z } from 'zod'

type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ANY'

export type RouteFormat = `${Method} /${string}` | '$default'

export const RouteSchema = z.union([
	z.string().regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS|ANY)(\s\/[a-z0-9\+\_\-\/\{\}]*)$/gi, 'Invalid route'),
	z.literal('$default'),
])

export const parseRoute = (route: RouteFormat) => {
	const [method, ...paths] = route.split(' ') as [Method, string]
	const path = paths.join(' ')

	return { method, path }
}
