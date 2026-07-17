import type { CloudWatchLogsEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { asyncRoute } from './util.js'

export const logHandler: RouteMatcher<CloudWatchLogsEvent> = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (route.split(':')[1] === 'on-error-log') {
			return asyncRoute(route, event.event)
		}

		return
	}

	if (typeof event?.awslogs?.data === 'string') {
		return asyncRoute(`${process.env.APP}:on-error-log:handler`, event)
	}

	return
}
