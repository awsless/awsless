import { parse, patch } from '@awsless/json'
import { invoke } from '@awsless/lambda'
import { deleteObject, getObject } from '@awsless/s3'
import { Context, S3CreateEvent, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda'
import { formatRoutePayload, getRouteEnv } from 'awsless'
import {
	AsyncLambdaFailureEvent,
	DynamoDBStreamFailureEvent,
	FunctionFailureEvent,
	QueueFailureEvent,
	UnknownFailureEvent,
} from './types'

export default async (event: S3CreateEvent | SQSEvent, context: Context) => {
	if (!Array.isArray(event.Records)) {
		throw new TypeError(`Unknown Event Type: ${JSON.stringify(event)}`)
	}

	await Promise.all(
		event.Records.map(record => {
			return unknownRecord(record, context)
		})
	)
}

const unknownRecord = (record: S3EventRecord | SQSRecord, context: Context) => {
	if (typeof record.eventSource === 'string') {
		if (record.eventSource.startsWith('aws:sqs')) {
			return sqsRecord(record as SQSRecord, context)
		}

		if (record.eventSource.startsWith('aws:s3')) {
			return s3Record(record as S3EventRecord, context)
		}
	}

	throw new TypeError(`Unknown Record Type: ${JSON.stringify(record)}`)
}

const sqsRecord = async (record: SQSRecord, context: Context) => {
	const s3Records = parseS3Records(record.body)

	if (s3Records) {
		await Promise.all(s3Records.map(record => s3Record(record, context)))
		return
	}

	const payload: QueueFailureEvent = {
		type: 'queue',
		id: record.messageId,
		date: new Date(Number(record.attributes.SentTimestamp)),
		payload: parsePayload(record.body),
		queue: {
			name: record.messageAttributes.queueName?.stringValue,
			url: record.messageAttributes.queueUrl?.stringValue,
		},
	}

	await invokeConsumer(payload, context)
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

const s3Record = async (record: S3EventRecord, context: Context) => {
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

	await invokeConsumer(payload, context)

	await deleteObject({
		bucket: record.s3.bucket.name,
		key,
	})
}

const isDynamoDBFailureEvent = (event: UnknownFailureEvent): event is DynamoDBStreamFailureEvent => {
	return 'DDBStreamBatchInfo' in event
}

const formatUnknownFailureEvent = (event: UnknownFailureEvent): FunctionFailureEvent => {
	if (isDynamoDBFailureEvent(event)) {
		return formatDynamoDBStreamFailureEvent(event)
	}

	return formatAsyncLambdaFailureEvent(event)
}

const formatAsyncLambdaFailureEvent = (event: AsyncLambdaFailureEvent): FunctionFailureEvent => {
	const payload = patchPayload(event.requestPayload) as { '$awsless-route'?: unknown; event?: unknown } | null
	const route = payload && typeof payload === 'object' ? payload['$awsless-route'] : undefined

	return {
		type: 'async-lambda',
		date: new Date(event.timestamp),
		id: event.requestContext.requestId,
		function: {
			name: typeof route === 'string' ? route : event.requestContext.functionArn.split(':')[6]!,
		},
		payload: typeof route === 'string' ? (payload!.event ?? {}) : payload,
		error: {
			type: event.responsePayload.errorType,
			message: event.responsePayload.errorMessage,
			stackTrace: event.responsePayload.stackTrace,
		},
	}
}

const formatDynamoDBStreamFailureEvent = (event: DynamoDBStreamFailureEvent): FunctionFailureEvent => {
	return {
		type: 'dynamodb-stream',
		date: new Date(event.timestamp),
		id: event.requestContext.requestId,
		function: {
			name: event.requestContext.functionArn.split(':')[6]!,
		},
		payload: parsePayload(event.payload),
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

const invokeConsumer = async (payload: unknown, context: Context) => {
	await invoke({
		name: context.invokedFunctionArn,
		type: 'RequestResponse',
		payload: formatRoutePayload(getRouteEnv('CONSUMER')!, payload),
	})
}
