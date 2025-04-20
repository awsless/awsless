import { z } from 'zod'
import { aws } from '@awsless/formation'

export type RouteFormat = `${aws.elb.HttpRequestMethod} /${string}` | '$default'

export const RouteSchema = z.union([
	z.string().regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/\{\}]*)$/gi, 'Invalid route'),
	z.literal('$default'),
])

export const parseRoute = (route: RouteFormat) => {
	const [method, ...paths] = route.split(' ') as [aws.elb.HttpRequestMethod, string]
	const path = paths.join(' ')

	return { method, path }
}
