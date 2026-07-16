import type { CloudWatchAlarmEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const metricHandler: RouteMatcher<CloudWatchAlarmEvent> = event => {
	if (typeof event?.['$awsless-route'] === 'string' || typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	if (event?.source === 'aws.cloudwatch' && typeof event.alarmArn === 'string') {
		const alarmName = event.alarmArn.split(':alarm:').at(-1)!
		const route = alarmName
			.slice(process.env.APP!.length + 2)
			.split('--')
			.join(':')

		if (route.split(':')[1] === 'metric') {
			return {
				key: route,
				payload: event,
				expectedErrors: true,
			}
		}
	}
}
