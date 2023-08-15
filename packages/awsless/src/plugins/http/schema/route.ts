import { z } from "zod"

export type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'
export type Route = `${Method} /${string}`

export const RouteSchema = z.custom<Route>((route) => {
	return z.string()
		.regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/]*)$/ig)
		.safeParse(route).success
}, 'Invalid route')
