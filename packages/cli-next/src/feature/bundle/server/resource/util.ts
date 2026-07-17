import type { BundleEvent, RouteMatch } from './types.js'

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
