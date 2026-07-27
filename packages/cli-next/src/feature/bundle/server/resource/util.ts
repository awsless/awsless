import type { BundleEvent, RouteMatch } from './types.js'

// Route keys follow the "scope:type:name" format.
export const routeType = (route: string) => {
	return route.split(':')[1]
}

// Map a physical resource name like "app--stack--queue--id" back to the "stack:queue:id" route key.
export const routeFromResourceName = (name: string) => {
	return name.slice(process.env.APP!.length + 2).split('--').join(':')
}

// Async event handlers must throw expected errors, so failed invocations retry & reach the on-failure destination.
export const asyncRoute = (key: string, payload: unknown): RouteMatch => {
	process.env.THROW_EXPECTED_ERRORS = '1'

	return { key, payload }
}

// The cloudfront OAC signing claims the authorization header,
// so the router tunnels the viewer authorization in a custom header that we restore here.
export const webRoute = (key: string, event: BundleEvent): RouteMatch => {
	const authorization = event.headers?.['x-awsless-authorization']

	if (typeof authorization === 'string') {
		event.headers!.authorization = authorization
		delete event.headers!['x-awsless-authorization']
	}

	return { key, payload: event }
}
