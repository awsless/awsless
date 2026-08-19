import { gzipSync } from 'zlib'
import type { CloudWatchLogsEvent, Context } from 'aws-lambda'
import { beforeEach, describe, expect, it } from 'vitest'
import { createHandler, ErrorEvent } from '../src/feature/on-error-log/server/handle'

describe('on error log handler', () => {
	const events: ErrorEvent[] = []
	let consumerError: Error | undefined
	let consumerHang = false

	const consumer = (event: ErrorEvent) => {
		events.push(event)

		if (consumerError) {
			return Promise.reject(consumerError)
		}

		if (consumerHang) {
			return new Promise<void>(() => {})
		}

		return Promise.resolve()
	}

	const handle = createHandler(consumer)

	beforeEach(() => {
		events.length = 0
		consumerError = undefined
		consumerHang = false
	})

	const context = (remaining = 60_000) => {
		return {
			awsRequestId: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
			getRemainingTimeInMillis: () => remaining,
		} as Context
	}

	const logsEvent = (logEvents: { message: unknown; timestamp?: number }[]) => {
		const payload = {
			logGroup: '/aws/lambda/test-app--function--bundle',
			logEvents: logEvents.map((entry, index) => ({
				id: `event-${index}`,
				message: typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message),
				timestamp: entry.timestamp ?? 1767225600000,
			})),
		}

		return {
			awslogs: {
				data: gzipSync(JSON.stringify(payload)).toString('base64'),
			},
		} as CloudWatchLogsEvent
	}

	const requestId = '123e4567-e89b-12d3-a456-426614174000'

	it('consumes a runtime error log', async () => {
		await handle(
			logsEvent([
				{
					message: {
						timestamp: '2026-01-01T00:00:00.000Z',
						level: 'ERROR',
						requestId,
						message: {
							errorType: 'TypeError',
							errorMessage: 'boom',
							stackTrace: ['line-1'],
						},
					},
				},
			]),
			context()
		)

		expect(events).toStrictEqual([
			{
				hash: expect.any(String),
				requestId,
				origin: 'test-app--function--bundle',
				level: 'error',
				type: 'TypeError',
				message: 'boom',
				stackTrace: ['line-1'],
				data: undefined,
				date: new Date(1767225600000),
			},
		])
	})

	it('names the origin after the route of bundled errors', async () => {
		await handle(
			logsEvent([
				{
					message: {
						timestamp: '2026-01-01T00:00:00.000Z',
						level: 'error',
						requestId,
						message: {
							errorType: 'Error',
							errorMessage: 'boom',
							route: 'test-stack:task:export',
						},
					},
				},
			]),
			context()
		)

		expect(events[0]).toMatchObject({
			origin: 'test-stack:task:export',
		})
	})

	it('consumes a platform report as a fatal error', async () => {
		await handle(
			logsEvent([
				{
					message: {
						type: 'platform.report',
						time: '2026-01-01T00:00:00.000Z',
						record: {
							requestId,
							status: 'timeout',
						},
					},
				},
			]),
			context()
		)

		expect(events[0]).toMatchObject({
			level: 'fatal',
			type: 'timeout',
			message: 'Fatal system error: timeout',
		})
	})

	it('consumes a plain string error log', async () => {
		await handle(
			logsEvent([
				{
					message: {
						timestamp: '2026-01-01T00:00:00.000Z',
						level: 'warn',
						requestId,
						message: 'something looks off',
					},
				},
			]),
			context()
		)

		expect(events[0]).toMatchObject({
			level: 'warn',
			type: 'Error',
			message: 'something looks off',
		})
	})

	it('skips unparsable log events', async () => {
		await handle(logsEvent([{ message: 'not json' }, { message: { unrelated: true } }]), context())

		expect(events).toStrictEqual([])
	})

	it('never throws when the consumer fails', async () => {
		consumerError = new Error('consumer failed')

		await expect(
			handle(
				logsEvent([
					{
						message: {
							timestamp: '2026-01-01T00:00:00.000Z',
							level: 'error',
							requestId,
							message: 'boom',
						},
					},
				]),
				context()
			)
		).resolves.toBeUndefined()

		expect(events).toHaveLength(1)
	})

	it('abandons a hung consumer before the invoke deadline', async () => {
		consumerHang = true

		await expect(
			handle(
				logsEvent([
					{
						message: {
							timestamp: '2026-01-01T00:00:00.000Z',
							level: 'error',
							requestId,
							message: 'boom',
						},
					},
				]),
				context(3_100)
			)
		).resolves.toBeUndefined()

		expect(events).toHaveLength(1)
	})
})
