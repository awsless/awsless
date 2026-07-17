import type { CloudWatchLogsEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const logHandler: RouteMatcher<CloudWatchLogsEvent> = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (route.split(':')[1] === 'on-error-log') {
			return {
				key: route,
				payload: event.event,
				expectedErrors: true,
			}
		}

		return
	}

	if (typeof event?.awslogs?.data === 'string') {
		return {
			key: `${process.env.APP}:on-error-log:handler`,
			payload: event,
		}
	}
}
