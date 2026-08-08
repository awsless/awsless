import type { CloudWatchAlarmEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeFromResourceName, routeType } from './util.js'

export const metricHandler: RouteMatcher<CloudWatchAlarmEvent> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string' || typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	if (event?.source === 'aws.cloudwatch' && typeof event.alarmArn === 'string') {
		const alarmName = event.alarmArn.split(':alarm:').at(-1)!
		const route = routeFromResourceName(alarmName)

		if (routeType(route) === 'metric') {
			return asyncRoute(route, event)
		}
	}

	return
}
