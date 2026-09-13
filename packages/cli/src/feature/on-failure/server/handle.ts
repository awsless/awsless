import { parse, patch, unpatch } from '@awsless/json'
import { deleteObject, getObject } from '@awsless/s3'
import { S3CreateEvent, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda'
import { ROUTE_PROPERTY } from 'awsless'
import {
	AsyncLambdaFailureEvent,
	DynamoDBStreamFailureEvent,
	FailureEvent,
	FunctionFailureEvent,
	QueueFailureEvent,
	UnknownFailureEvent,
} from './types'
import { getFailureSource, isDynamoDBFailureEvent, logicalResourceName } from './util'

type Consumer = (event: FailureEvent) => Promise<unknown>

export const createHandler = (consumer: Consumer) => {
	// Mimic a real invocation payload
	const invoke: Consumer = event => consumer(unpatch(event))

	return async (event: S3CreateEvent | SQSEvent) => {
		if (!Array.isArray(event.Records)) {
			throw new TypeError(`Unknown Event Type: ${JSON.stringify(event)}`)
		}

		await Promise.all(
			event.Records.map(record => {
				return unknownRecord(record, invoke)
			})
		)
	}
}

const unknownRecord = (record: S3EventRecord | SQSRecord, consumer: Consumer) => {
	if (typeof record.eventSource === 'string') {
		if (record.eventSource.startsWith('aws:sqs')) {
			return sqsRecord(record as SQSRecord, consumer)
		}

		if (record.eventSource.startsWith('aws:s3')) {
			return s3Record(record as S3EventRecord, consumer)
		}
	}

	throw new TypeError(`Unknown Record Type: ${JSON.stringify(record)}`)
}

const sqsRecord = async (record: SQSRecord, consumer: Consumer) => {
	const s3Records = parseS3Records(record.body)

	if (s3Records) {
		await Promise.all(s3Records.map(record => s3Record(record, consumer)))
		return
	}

	// Anything else on the queue is a dead-lettered scheduler delivery.
	const payload: QueueFailureEvent = {
		type: 'queue',
		id: record.messageId,
		date: new Date(Number(record.attributes.SentTimestamp)),
		payload: parsePayload(record.body),
	}

	await consumer(payload)
}

const parseS3Records = (body: string): S3EventRecord[] | undefined => {
	try {
		const event = JSON.parse(body)

		if (event?.Event === 's3:TestEvent') {
			return []
		}

		if (Array.isArray(event?.Records) && event.Records[0]?.eventSource === 'aws:s3') {
			return event.Records
		}
	} catch {}

	return
}

const s3Record = async (record: S3EventRecord, consumer: Consumer) => {
	const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))
	const object = await getObject({
		bucket: record.s3.bucket.name,
		key,
	})

	if (!object) {
		return
	}

	const json = await object.body.transformToString()
	const unknownEvent = JSON.parse(json) as UnknownFailureEvent
	const payload = formatUnknownFailureEvent(unknownEvent)

	await consumer(payload)

	await deleteObject({
		bucket: record.s3.bucket.name,
		key,
	})
}

const formatUnknownFailureEvent = (event: UnknownFailureEvent): FunctionFailureEvent => {
	if (isDynamoDBFailureEvent(event)) {
		return formatDynamoDBStreamFailureEvent(event)
	}

	return formatAsyncLambdaFailureEvent(event)
}

const formatAsyncLambdaFailureEvent = (event: AsyncLambdaFailureEvent): FunctionFailureEvent => {
	const payload = patchPayload(event.requestPayload) as { [ROUTE_PROPERTY]?: unknown; event?: unknown } | null
	const route = payload && typeof payload === 'object' ? payload[ROUTE_PROPERTY] : undefined

	return {
		type: 'async-lambda',
		date: new Date(event.timestamp),
		id: event.requestContext.requestId,
		function: {
			name: typeof route === 'string' ? route : event.requestContext.functionArn.split(':')[6]!,
		},
		payload: typeof route === 'string' ? (payload!.event ?? {}) : payload,
		source:
			typeof route === 'string' ? { resource: route, event: payload!.event ?? {} } : getFailureSource(payload),
		error: {
			type: event.responsePayload.errorType,
			message: event.responsePayload.errorMessage,
			stackTrace: event.responsePayload.stackTrace,
		},
	}
}

const formatDynamoDBStreamFailureEvent = (event: DynamoDBStreamFailureEvent): FunctionFailureEvent => {
	const payload = parsePayload(event.payload)
	const streamArn = event.DDBStreamBatchInfo?.streamArn
	const table = streamArn?.split('/')[1]

	return {
		type: 'dynamodb-stream',
		date: new Date(event.timestamp),
		id: event.requestContext.requestId,
		function: {
			name: event.requestContext.functionArn.split(':')[6]!,
		},
		payload,
		source: table ? { resource: logicalResourceName(table) } : getFailureSource(payload),
	}
}

const parsePayload = (payload: string) => {
	try {
		return parse(payload)
	} catch {
		return payload
	}
}

const patchPayload = (payload: unknown) => {
	try {
		return patch(payload)
	} catch {
		return payload
	}
}
