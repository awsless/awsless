import type { CloudWatchLogsEvent } from 'aws-lambda'
import { ROUTE_PROPERTY } from 'awsless'
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
	}

	// A raw awslogs event never reaches the bundle: deployed apps run the
	// handler stand-alone & locally only the consumer route registers.
	return
}
