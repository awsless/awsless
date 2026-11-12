import type { DynamoDBStreamEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher, RouteSpan } from './types.js'
import { asyncRoute, getOldestAge, routeFromResourceName, routeType } from './util.js'

// A stream batch's size, its kinds of changes and how far the stream runs behind the table.
const describeTableSpan = (event: Partial<DynamoDBStreamEvent>): RouteSpan => {
	const records = event.Records ?? []
	const countRecords = (eventName: string) => records.filter(record => record.eventName === eventName).length

	return {
		trigger: 'dynamodb',
		metadata: {
			table: records[0]?.eventSourceARN?.split('/')[1] ?? 'unknown',
			records: records.length,
			inserts: countRecords('INSERT'),
			modifies: countRecords('MODIFY'),
			removes: countRecords('REMOVE'),
			// DynamoDB's own removals of expired items.
			ttl_removals: records.filter(record => record.userIdentity?.principalId === 'dynamodb.amazonaws.com')
				.length,
			...getOldestAge(
				'oldest_record_age_ms',
				records.map(record => Number(record.dynamodb?.ApproximateCreationDateTime) * 1000)
			),
		},
	}
}

export const tableHandler: RouteMatcher<DynamoDBStreamEvent> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string' || typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	const record = event?.Records?.[0]

	if (record?.eventSource === 'aws:dynamodb' && typeof record.eventSourceARN === 'string') {
		const tableName = record.eventSourceARN.split('/')[1]!
		const route = routeFromResourceName(tableName)

		if (routeType(route) === 'table') {
			return asyncRoute(route, event, () => describeTableSpan(event))
		}
	}

	return
}
