import type { SQSEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { asyncRoute } from './util.js'

export const onFailureHandler: RouteMatcher<SQSEvent> = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (route.split(':')[1] === 'on-failure') {
			return asyncRoute(route, event.event)
		}

		return
	}

	if (typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	const record = event?.Records?.[0]
	const eventSourceArn = record?.eventSourceARN

	if (
		record?.eventSource === 'aws:sqs' &&
		typeof eventSourceArn === 'string' &&
		eventSourceArn.endsWith(':' + process.env.APP + '--on-failure--failure')
	) {
		return asyncRoute(`${process.env.APP}:on-failure:normalizer`, event)
	}

	return
}
