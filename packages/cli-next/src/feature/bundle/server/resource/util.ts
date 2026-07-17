import type { BundleEvent, RouteMatch } from './types.js'

// Async event handlers run with expected-error responses enabled.
export const asyncRoute = (key: string, payload: unknown): RouteMatch => {
	process.env.THROW_EXPECTED_ERRORS = '1'

	return { key, payload }
}

// Restore the viewer authorization that the router tunneled around the OAC signing.
export const webRoute = (key: string, event: BundleEvent): RouteMatch => {
	const authorization = event.headers?.['x-awsless-authorization']

	if (typeof authorization === 'string') {
		event.headers!.authorization = authorization
		delete event.headers!['x-awsless-authorization']
	}

	return { key, payload: event }
}
