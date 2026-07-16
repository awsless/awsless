import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const restHandler: RouteMatcher<APIGatewayProxyEventV2> = event => {
	if (typeof event?.['$awsless-route'] === 'string') {
		return
	}

	const route = event?.headers?.['x-awsless-route']

	if (typeof route === 'string' && route.split(':')[1] === 'rest') {
		return {
			key: route,
			payload: event,
		}
	}
}
