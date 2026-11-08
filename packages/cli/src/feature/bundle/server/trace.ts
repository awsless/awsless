import { ExpectedError, isErrorResponse, type LambdaContext } from '@awsless/lambda'
import type { CloudWatchAlarmEvent, DynamoDBStreamEvent, S3Event, SNSEvent, SQSEvent } from 'aws-lambda'
import type { SpanEnd, TraceAnnotations, TraceOptions } from 'awsless'
import type { RouteMatch } from './resource/types.js'
import { routeType } from './resource/util.js'

// What a route's span tells about its run, per trigger: counts, names, ages
// and retries, never a payload, a url or an item's keys, which can hold
// personal data. Annotations are few (X-Ray indexes 50 per trace); the rest
// is metadata.

type Metadata = Record<string, string | number | boolean>

export type RouteCall = {
	// Called by another route in the same process, rather than by Lambda.
	isInternal: boolean
	// The first invocation of this process.
	isColdStart: boolean
	context: LambdaContext
}

type Details = { trigger: string; metadata?: Metadata; annotations?: TraceAnnotations; http?: { method?: string } }

// How long ago the oldest of the times was, in milliseconds.
const getOldestAge = (times: number[]) => {
	const valid = times.filter(time => Number.isFinite(time))

	if (!valid.length) {
		return
	}

	return Math.max(0, Date.now() - valid.reduce((oldest, time) => Math.min(oldest, time), Infinity))
}

const countBy = (values: string[]) => {
	const counts: Record<string, number> = {}

	for (const value of values) {
		counts[value] = (counts[value] ?? 0) + 1
	}

	return counts
}

const withAge = (key: string, age: number | undefined): Metadata => (age === undefined ? {} : { [key]: age })

const describeQueue = (event: SQSEvent): Details => {
	const records = event.Records
	const receiveCounts = records.map(record => Number(record.attributes?.ApproximateReceiveCount ?? 1))
	const maxReceiveCount = Math.max(1, ...receiveCounts)
	const queue = records[0]?.eventSourceARN?.split(':').at(-1) ?? 'unknown'

	return {
		trigger: 'sqs',
		// A batch with a message on its second or later try.
		annotations: { retried: maxReceiveCount > 1 },
		metadata: {
			queue,
			messages: records.length,
			max_receive_count: maxReceiveCount,
			...withAge(
				'oldest_message_age_ms',
				getOldestAge(records.map(record => Number(record.attributes?.SentTimestamp)))
			),
		},
	}
}

const describeTable = (event: DynamoDBStreamEvent): Details => {
	const records = event.Records
	const counts = countBy(records.map(record => record.eventName ?? 'unknown'))
	const ttlRemovals = records.filter(record => record.userIdentity?.principalId === 'dynamodb.amazonaws.com').length

	return {
		trigger: 'dynamodb',
		metadata: {
			table: records[0]?.eventSourceARN?.split('/')[1] ?? 'unknown',
			records: records.length,
			inserts: counts.INSERT ?? 0,
			modifies: counts.MODIFY ?? 0,
			removes: counts.REMOVE ?? 0,
			ttl_removals: ttlRemovals,
			// How far the stream runs behind the table.
			...withAge(
				'oldest_record_age_ms',
				getOldestAge(records.map(record => Number(record.dynamodb?.ApproximateCreationDateTime) * 1000))
			),
		},
	}
}

const describeTopic = (event: SNSEvent): Details => {
	const records = event.Records
	const eventType = records[0]?.Sns?.MessageAttributes?.event?.Value

	return {
		trigger: 'sns',
		metadata: {
			topic: records[0]?.Sns?.TopicArn?.split(':').at(-1) ?? 'unknown',
			messages: records.length,
			...(records[0]?.Sns?.MessageId ? { message_id: records[0].Sns.MessageId } : {}),
			...(eventType ? { pubsub_event: eventType } : {}),
			...withAge('oldest_message_age_ms', getOldestAge(records.map(record => Date.parse(record.Sns?.Timestamp)))),
		},
	}
}

const describeStore = (event: S3Event): Details => {
	const records = event.Records

	return {
		trigger: 's3',
		metadata: {
			bucket: records[0]?.s3?.bucket?.name ?? 'unknown',
			records: records.length,
			events: [...new Set(records.map(record => record.eventName))].join(','),
			...withAge('oldest_event_age_ms', getOldestAge(records.map(record => Date.parse(record.eventTime)))),
		},
	}
}

const describeAlarm = (event: CloudWatchAlarmEvent): Details => ({
	trigger: 'cloudwatch',
	metadata: {
		alarm: event.alarmData?.alarmName ?? 'unknown',
		state: event.alarmData?.state?.value ?? 'unknown',
	},
})

const hasRecords = (payload: unknown, source: string) => {
	const records = (payload as { Records?: Array<{ eventSource?: string; EventSource?: string }> } | undefined)
		?.Records

	return Array.isArray(records) && (records[0]?.eventSource === source || records[0]?.EventSource === source)
}

const getHttpMethod = (payload: unknown) => {
	return (payload as { requestContext?: { http?: { method?: unknown } } } | undefined)?.requestContext?.http?.method
}

const describeTrigger = (match: RouteMatch, call: RouteCall): Details => {
	const { payload } = match

	if (call.isInternal) {
		return { trigger: 'internal' }
	}

	if (hasRecords(payload, 'aws:sqs')) {
		return describeQueue(payload as SQSEvent)
	}

	if (hasRecords(payload, 'aws:dynamodb')) {
		return describeTable(payload as DynamoDBStreamEvent)
	}

	if (hasRecords(payload, 'aws:sns')) {
		return describeTopic(payload as SNSEvent)
	}

	if (hasRecords(payload, 'aws:s3')) {
		return describeStore(payload as S3Event)
	}

	if ((payload as CloudWatchAlarmEvent | undefined)?.source === 'aws.cloudwatch') {
		return describeAlarm(payload as CloudWatchAlarmEvent)
	}

	const method = getHttpMethod(payload)

	if (typeof method === 'string') {
		return { trigger: 'http', http: { method } }
	}

	// Crons are invoked by EventBridge, tasks by an async invoke or a schedule, the rest by a sync invoke.
	const type = routeType(match.key)

	return { trigger: type === 'cron' ? 'schedule' : type === 'task' ? 'async-invoke' : 'invoke' }
}

// The invocation's own facts, on the outermost span only.
const describeInvocation = (call: RouteCall): Metadata => {
	if (call.isInternal) {
		return {}
	}

	const { context } = call
	const version = context.invokedFunctionArn?.split(':')[7]

	return {
		...(context.awsRequestId ? { request_id: context.awsRequestId } : {}),
		...(version ? { qualifier: version } : {}),
		...(context.memoryLimitInMB ? { memory_mb: Number(context.memoryLimitInMB) } : {}),
		...(typeof context.getRemainingTimeInMillis === 'function'
			? { remaining_ms: context.getRemainingTimeInMillis() }
			: {}),
	}
}

const describeResult = (result: unknown): SpanEnd => {
	if (isErrorResponse(result)) {
		return { error: true, errorType: result.__error__.type }
	}

	// A queue route's partial batch answer: the messages that go back on the queue.
	const failures = (result as { batchItemFailures?: unknown } | undefined)?.batchItemFailures

	if (Array.isArray(failures) && failures.length) {
		return { error: true, errorType: 'batch-item-failures', metadata: { failed_messages: failures.length } }
	}

	const status = (result as { statusCode?: unknown } | undefined)?.statusCode

	if (typeof status === 'number') {
		return {
			http: { status },
			...(status === 429
				? { throttle: true }
				: status >= 500
					? { fault: true }
					: status >= 400
						? { error: true }
						: {}),
		}
	}

	return {}
}

// An expected error is the caller's (an error), anything else ours (a fault).
const describeError = (error: unknown): SpanEnd => {
	if (error instanceof ExpectedError) {
		return { error: true, errorType: error.type }
	}

	return { fault: true, errorType: error instanceof Error ? error.name : 'Error' }
}

export const describeRoute = (match: RouteMatch, call: RouteCall): TraceOptions<unknown> => {
	const details = describeTrigger(match, call)
	const metadata = { ...describeInvocation(call), ...details.metadata }

	return {
		annotations: {
			route: match.key,
			route_type: routeType(match.key) ?? 'unknown',
			trigger: details.trigger,
			...(call.isInternal ? {} : { cold_start: call.isColdStart }),
			...details.annotations,
		},
		...(Object.keys(metadata).length ? { metadata } : {}),
		...(details.http ? { http: details.http } : {}),
		endWith: describeResult,
		endWithError: describeError,
	}
}
