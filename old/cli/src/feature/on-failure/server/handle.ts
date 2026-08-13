import { parse, patch } from '@awsless/json'
import { invoke } from '@awsless/lambda'
import { deleteObject, getObject } from '@awsless/s3'
import { S3CreateEvent, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda'
import {
	AsyncLambdaFailureEvent,
	DynamoDBStreamFailureEvent,
	FunctionFailureEvent,
	QueueFailureEvent,
	UnknownFailureEvent,
} from './types'

export default async (event: S3CreateEvent | SQSEvent) => {
	if (!Array.isArray(event.Records)) {
		throw new TypeError(`Unknown Event Type: ${JSON.stringify(event)}`)
	}

	await Promise.all(
		event.Records.map(record => {
			return unknownRecord(record)
		})
	)
}

const unknownRecord = (record: S3EventRecord | SQSRecord) => {
	if (typeof record.eventSource === 'string') {
		if (record.eventSource.startsWith('aws:sqs')) {
			return sqsRecord(record as SQSRecord)
		}

		if (record.eventSource.startsWith('aws:s3')) {
			return s3Record(record as S3EventRecord)
		}
	}

	throw new TypeError(`Unknown Record Type: ${JSON.stringify(record)}`)
}

const sqsRecord = async (record: SQSRecord) => {
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

	await invokeConsumer(payload)
}

const s3Record = async (record: S3EventRecord) => {
	const object = await getObject({
		bucket: record.s3.bucket.name,
		key: record.s3.object.key,
	})

	if (!object) {
		return
	}

	const json = await object.body.transformToString()
	const unknownEvent = JSON.parse(json) as UnknownFailureEvent
	const payload = formatUnknownFailureEvent(unknownEvent)

	await invokeConsumer(payload)

	await deleteObject({
		bucket: record.s3.bucket.name,
		key: record.s3.object.key,
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
	return {
		type: 'async-lambda',
		date: new Date(event.timestamp),
		id: event.requestContext.requestId,
		function: {
			name: event.requestContext.functionArn.split(':')[6]!,
		},
		payload: patchPayload(event.requestPayload),
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

const invokeConsumer = async (payload: unknown) => {
	const name = process.env.CONSUMER

	if (!name) {
		throw new Error('CONSUMER environment variable is not set')
	}

	await invoke({
		name,
		type: 'RequestResponse',
		payload,
	})
}
