import { ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { invokedRoute, routeType } from './util.js'

// An rpc function, invoked by the rpc server. The server itself only takes
// the web function's requests.
export const rpcHandler: RouteMatcher = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string' && routeType(route) === 'rpc') {
		return invokedRoute(route, event.event)
	}

	return
}
