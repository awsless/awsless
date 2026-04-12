import { z } from 'zod'
import { HttpRequestMethod } from '../../formation/resource/elb/listener-rule.js'

export type RouteFormat = `${HttpRequestMethod} /${string}` | '$default'

export const RouteSchema = z.union([
	z.string().regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/\{\}]*)$/gi, 'Invalid route'),
	z.literal('$default'),
])

export const parseRoute = (route: RouteFormat) => {
	const [method, ...paths] = route.split(' ') as [HttpRequestMethod, string]
	const path = paths.join(' ')

	return { method, path }
}
