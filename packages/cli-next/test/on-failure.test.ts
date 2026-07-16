import { mockLambda } from '@awsless/lambda'
import { getObject, mockS3, putObject } from '@awsless/s3'
import { formatRouteEnvName } from 'awsless'
import { beforeEach, describe, expect, it } from 'vitest'
import handle from '../src/feature/on-failure/server/handle'

describe('on failure handler', () => {
	const functionArn = 'arn:aws:lambda:eu-west-1:123456789:function:test-app--function--bundle:live'
	const normalizerRoute = 'test-app:on-failure:normalizer'
	const consumerRoute = 'test-app:on-failure:consumer'
	const invokes: unknown[] = []
	let consumerError: Error | undefined

	mockS3()
	mockLambda({
		[functionArn]: payload => {
			invokes.push(payload)

			if (consumerError) {
				return Promise.reject(consumerError)
			}
		},
	})

	beforeEach(() => {
		invokes.length = 0
		consumerError = undefined
		process.env.AWSLESS_ROUTE = normalizerRoute
		process.env[formatRouteEnvName(normalizerRoute, 'CONSUMER')] = consumerRoute
	})

	const context = { invokedFunctionArn: functionArn } as any
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

		await handle(sqsEvent(s3Event('failure+object.json')) as any, context)

		expect(invokes).toStrictEqual([
			{
				'$awsless-route': consumerRoute,
				event: {
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

		await expect(handle(sqsEvent(s3Event('retry.json')) as any, context)).rejects.toThrow('consumer failed')
		await expect(getObject({ bucket: 'failures', key: 'retry.json' })).resolves.toBeDefined()
	})

	it('ignores the S3 notification test event', async () => {
		await handle(sqsEvent({ Event: 's3:TestEvent' }) as any, context)

		expect(invokes).toStrictEqual([])
	})

	it('normalizes ordinary failure queue messages', async () => {
		await handle(sqsEvent('{"task":"failed"}') as any, context)

		expect(invokes).toStrictEqual([
			{
				'$awsless-route': consumerRoute,
				event: {
					type: 'queue',
					id: 'message-id',
					date: new Date('2026-01-01T00:00:00.000Z'),
					payload: { task: 'failed' },
					queue: {},
				},
			},
		])
	})
})
