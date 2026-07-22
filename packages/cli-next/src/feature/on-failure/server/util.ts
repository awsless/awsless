import { parse } from '@awsless/json'
import { DynamoDBStreamFailureEvent, FailureSource, UnknownFailureEvent } from './types'

export const isDynamoDBFailureEvent = (event: UnknownFailureEvent): event is DynamoDBStreamFailureEvent => {
	return 'DDBStreamBatchInfo' in event
}

// Physical resource names look like `app--stack--table--name` for stack
// resources and `app--topic--name` for app level resources.
export const logicalResourceName = (physical: string) => {
	const segments = physical.replace(/\.fifo$/, '').split('--')

	if (segments.length === 4) {
		return `${segments[1]}:${segments[2]}:${segments[3]}`
	}

	if (segments.length === 3) {
		return `${segments[1]}:${segments[2]}`
	}

	return physical
}

// Every consumer runs inside the shared bundle function, so the physical
// function name never names the failed resource. The delivery record in the
// raw invocation payload does: it tells which topic, table stream or queue
// invoked the consumer, and carries the app level event it received.
export const getFailureSource = (payload: unknown): FailureSource | undefined => {
	const record = getDeliveryRecord(payload)

	if (!record) {
		return
	}

	if (isTopicRecord(record)) {
		return {
			resource: record.Sns.TopicArn ? logicalResourceName(lastArnSegment(record.Sns.TopicArn)) : 'topic',
			event: parseEvent(record.Sns.Message),
		}
	}

	if (isStreamRecord(record)) {
		const table = record.eventSourceARN.split('/')[1]

		return {
			resource: table ? logicalResourceName(table) : 'table-stream',
		}
	}

	if (isQueueRecord(record)) {
		return {
			resource: logicalResourceName(lastArnSegment(record.eventSourceARN)),
			event: parseEvent(record.body),
		}
	}

	return
}

type TopicRecord = {
	Sns: {
		TopicArn?: string
		Message?: string
	}
}

type StreamRecord = {
	eventSource: 'aws:dynamodb'
	eventSourceARN: string
}

type QueueRecord = {
	eventSource: 'aws:sqs'
	eventSourceARN: string
	body?: string
}

const getDeliveryRecord = (payload: unknown): object | undefined => {
	if (!payload || typeof payload !== 'object') {
		return
	}

	const records = (payload as { Records?: unknown }).Records
	const record = Array.isArray(records) ? records[0] : undefined

	return record && typeof record === 'object' ? record : undefined
}

const isTopicRecord = (record: object): record is TopicRecord => {
	return 'Sns' in record && typeof record.Sns === 'object' && record.Sns !== null
}

const isStreamRecord = (record: object): record is StreamRecord => {
	return 'eventSource' in record && record.eventSource === 'aws:dynamodb' && 'eventSourceARN' in record
}

const isQueueRecord = (record: object): record is QueueRecord => {
	return 'eventSource' in record && record.eventSource === 'aws:sqs' && 'eventSourceARN' in record
}

const lastArnSegment = (arn: string) => {
	return arn.split(':').at(-1)!
}

const parseEvent = (value: unknown) => {
	if (typeof value !== 'string') {
		return value
	}

	try {
		return parse(value)
	} catch {
		return value
	}
}
