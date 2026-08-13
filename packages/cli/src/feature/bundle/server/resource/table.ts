import type { DynamoDBStreamEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeFromResourceName, routeType } from './util.js'

export const tableHandler: RouteMatcher<DynamoDBStreamEvent> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string' || typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	const record = event?.Records?.[0]

	if (record?.eventSource === 'aws:dynamodb' && typeof record.eventSourceARN === 'string') {
		const tableName = record.eventSourceARN.split('/')[1]!
		const route = routeFromResourceName(tableName)

		if (routeType(route) === 'table') {
			return asyncRoute(route, event)
		}
	}

	return
}
