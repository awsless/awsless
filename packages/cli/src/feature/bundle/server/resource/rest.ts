import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { routeType, webRoute } from './util.js'

// A rest api has no CloudFront or router in front, so a caller could write the
// headers they set: the viewer's address & the route's params.
const getOwnHeaders = (headers: APIGatewayProxyEventV2['headers'] | undefined) => {
	return Object.fromEntries(
		Object.entries(headers ?? {}).filter(([name]) => {
			const lowerName = name.toLowerCase()

			return !lowerName.startsWith('cloudfront-') && !lowerName.startsWith('x-param-')
		})
	)
}

export const restHandler: RouteMatcher<APIGatewayProxyEventV2> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string') {
		return
	}

	const route = event?.headers?.[ROUTE_HEADER]

	if (typeof route === 'string' && routeType(route) === 'rest') {
		return webRoute(route, { ...event, headers: getOwnHeaders(event.headers) })
	}

	return
}
