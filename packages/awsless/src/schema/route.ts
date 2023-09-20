
import { z } from 'zod';
import { HttpRequestMethod } from '../formation/resource/elb/listener-rule.js';

export type RouteFormat = `${HttpRequestMethod} /${string}` | '$default'

export const RouteSchema = z.custom<RouteFormat>((route) => {
	return z.string()
		.regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/\{\}]*)$/ig)
		.safeParse(route).success
}, 'Invalid route')

export const parseRoute = (route:RouteFormat) => {
	const [ method, ...paths ] = route.split(' ') as [ HttpRequestMethod, string ]
	const path = paths.join(' ')

	return { method, path }
}
