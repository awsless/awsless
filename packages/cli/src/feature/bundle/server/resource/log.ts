import { ROUTE_PROPERTY } from 'awsless'
import type { CloudWatchLogsEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

// The on-error-log consumer only runs as a bundle route on the local
// dev worker - deployed apps run it as a stand-alone lambda.
export const logHandler: RouteMatcher<CloudWatchLogsEvent> = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string') {
		if (routeType(route) === 'on-error-log') {
			return asyncRoute(route, event.event)
		}

		return
	}

	if (typeof event?.awslogs?.data === 'string') {
		return asyncRoute('base:on-error-log:handler', event)
	}

	return
}
