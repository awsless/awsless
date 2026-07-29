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
import { getFailureSource, isDynamoDBFailureEvent, logicalResourceName } from './util'

// The wire constants mirror the awsless bundle runtime, without pulling
// the whole awsless package into the prebuilt zip.
const getBundleName = () => `${process.env.APP ?? 'app'}--function--bundle`
const LIVE_BUNDLE_ALIAS = 'live'
const CONSUMER_ROUTE = 'base:on-failure:consumer'

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
	const s3Records = parseS3Records(record.body)

	if (s3Records) {
		await Promise.all(s3Records.map(record => s3Record(record)))
		return
	}

	const queueName = record.messageAttributes.queueName?.stringValue
	const body = parsePayload(record.body)

	const payload: QueueFailureEvent = {
		type: 'queue',
		id: record.messageId,
		date: new Date(Number(record.attributes.SentTimestamp)),
		payload: body,
		source: queueName ? { resource: logicalResourceName(queueName), event: body } : undefined,
		queue: {
			name: queueName,
			url: record.messageAttributes.queueUrl?.stringValue,
		},
	}

	await invokeConsumer(payload)
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

const s3Record = async (record: S3EventRecord) => {
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

	await invokeConsumer(payload)

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
		source:
			typeof route === 'string'
				? { resource: route, event: payload!.event ?? {} }
				: getFailureSource(payload),
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

// The consumer runs inside the live bundle, so a consumer failure throws
// here & the failure object stays in the bucket for the sqs retry.
const invokeConsumer = async (payload: unknown) => {
	await invoke({
		name: getBundleName(),
		qualifier: LIVE_BUNDLE_ALIAS,
		type: 'RequestResponse',
		payload: {
			'$awsless-route': CONSUMER_ROUTE,
			event: payload,
		},
	})
}
