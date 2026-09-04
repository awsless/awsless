import { patch } from '@awsless/json'
import { mockS3, getObject, putObject } from '@awsless/s3'
import { beforeEach, describe, expect, it } from 'vitest'
import { createHandler } from '../src/feature/on-failure/server/handle'
import type { FailureEvent } from '../src/feature/on-failure/server/types'

process.env.APP ??= 'app'

describe('on failure handler', () => {
	const events: FailureEvent[] = []
	let consumerError: Error | undefined

	mockS3()

	// The deployed consumer is a lambda() handler that revives the json
	// codec markers, so the collected events mirror what it receives.
	const handle = createHandler(event => {
		events.push(patch(event))

		if (consumerError) {
			return Promise.reject(consumerError)
		}

		return Promise.resolve()
	})

	beforeEach(() => {
		events.length = 0
		consumerError = undefined
	})

	const asyncFailure = {
		timestamp: '2026-01-01T00:00:00.000Z',
		requestContext: {
			requestId: 'request-id',
			functionArn: 'arn:aws:lambda:eu-west-1:123456789:function:test-app--function--bundle:live',
		},
		requestPayload: { hello: 'world' },
		responsePayload: {
			errorType: 'Error',
			errorMessage: 'failed',
			stackTrace: ['line'],
		},
	}

	const sqsEvent = (body: unknown) => ({
		Records: [
			{
				eventSource: 'aws:sqs',
				messageId: 'message-id',
				body: typeof body === 'string' ? body : JSON.stringify(body),
				attributes: {
					SentTimestamp: '1767225600000',
				},
				messageAttributes: {},
			},
		],
	})

	const s3Event = (key: string) => ({
		Records: [
			{
				eventSource: 'aws:s3',
				s3: {
					bucket: { name: 'failures' },
					object: { key },
				},
			},
		],
	})

	it('normalizes S3 failure objects and deletes them after the consumer succeeds', async () => {
		await putObject({
			bucket: 'failures',
			key: 'failure object.json',
			body: JSON.stringify(asyncFailure),
		})

		await handle(sqsEvent(s3Event('failure+object.json')) as any)

		expect(events).toStrictEqual([
			{
				type: 'async-lambda',
				date: new Date('2026-01-01T00:00:00.000Z'),
				id: 'request-id',
				function: { name: 'test-app--function--bundle' },
				payload: { hello: 'world' },
				error: {
					type: 'Error',
					message: 'failed',
					stackTrace: ['line'],
				},
			},
		])
		await expect(getObject({ bucket: 'failures', key: 'failure object.json' })).resolves.toBeUndefined()
	})

	it('keeps the S3 object when the consumer fails', async () => {
		consumerError = new Error('consumer failed')
		await putObject({
			bucket: 'failures',
			key: 'retry.json',
			body: JSON.stringify(asyncFailure),
		})

		await expect(handle(sqsEvent(s3Event('retry.json')) as any)).rejects.toThrow('consumer failed')
		await expect(getObject({ bucket: 'failures', key: 'retry.json' })).resolves.toBeDefined()
	})

	it('ignores the S3 notification test event', async () => {
		await handle(sqsEvent({ Event: 's3:TestEvent' }) as any)

		expect(events).toStrictEqual([])
	})

	it('derives the failure source from routed payloads and delivery envelopes', async () => {
		const routedFailure = {
			...asyncFailure,
			requestPayload: {
				'$awsless-route': 'test-stack:task:export',
				event: { roomId: 'room-1' },
			},
		}

		await putObject({
			bucket: 'failures',
			key: 'routed.json',
			body: JSON.stringify(routedFailure),
		})
		await handle(sqsEvent(s3Event('routed.json')) as any)

		expect(events.at(-1)).toMatchObject({
			function: { name: 'test-stack:task:export' },
			source: { resource: 'test-stack:task:export', event: { roomId: 'room-1' } },
		})

		const topicFailure = {
			...asyncFailure,
			requestPayload: {
				Records: [
					{
						EventSource: 'aws:sns',
						Sns: {
							TopicArn: 'arn:aws:sns:eu-west-1:123456789:test-app--topic--failure-requested',
							Message: '{"id":"event-1"}',
						},
					},
				],
			},
		}

		await putObject({
			bucket: 'failures',
			key: 'topic.json',
			body: JSON.stringify(topicFailure),
		})
		await handle(sqsEvent(s3Event('topic.json')) as any)

		expect(events.at(-1)).toMatchObject({
			function: { name: 'test-app--function--bundle' },
			source: { resource: 'topic:failure-requested', event: { id: 'event-1' } },
		})
	})

	it('normalizes dead-lettered scheduler deliveries on the failure queue', async () => {
		await handle(sqsEvent('{"task":"failed"}') as any)

		expect(events).toStrictEqual([
			{
				type: 'queue',
				id: 'message-id',
				date: new Date('2026-01-01T00:00:00.000Z'),
				payload: { task: 'failed' },
			},
		])
	})
})
