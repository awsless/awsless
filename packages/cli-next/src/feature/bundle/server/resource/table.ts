import type { DynamoDBStreamEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { asyncRoute } from './util.js'

export const tableHandler: RouteMatcher<DynamoDBStreamEvent> = event => {
	if (typeof event?.['$awsless-route'] === 'string' || typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	const record = event?.Records?.[0]

	if (record?.eventSource === 'aws:dynamodb' && typeof record.eventSourceARN === 'string') {
		const tableName = record.eventSourceARN.split('/')[1]!
		const route = tableName
			.slice(process.env.APP!.length + 2)
			.split('--')
			.join(':')

		if (route.split(':')[1] === 'table') {
			return asyncRoute(route, event)
		}
	}

	return
}
