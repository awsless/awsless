import { readFileSync } from 'fs'
import { join } from 'path'
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

describe('on error log sourcemap integration', () => {
	const map = readFileSync(join(__dirname, '_fixture/sourcemap/index.mjs.map'), 'utf8')
	const requestId = '123e4567-e89b-12d3-a456-426614174000'

	const context = () => {
		return {
			awsRequestId: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
			getRemainingTimeInMillis: () => 60_000,
		} as Context
	}

	// The stream name carries the version whose env names the maps.
	const logsEvent = (message: unknown, logStream?: string) => {
		const payload = {
			logGroup: '/aws/lambda/test-app--function--bundle',
			logStream: logStream ?? '2026/08/21/[42]abcdef1234567890',
			logEvents: [{ id: 'event-0', message: JSON.stringify(message), timestamp: 1767225600000 }],
		}

		return {
			awslogs: {
				data: gzipSync(JSON.stringify(payload)).toString('base64'),
			},
		} as CloudWatchLogsEvent
	}

	const runtimeError = {
		timestamp: '2026-01-01T00:00:00.000Z',
		level: 'error',
		requestId,
		message: {
			errorType: 'TypeError',
			errorMessage: 'n is not a function',
			stackTrace: [
				'TypeError: n is not a function',
				'    at t (file:///var/task/index.mjs:1:70)',
				'    at n (file:///var/task/index.mjs:1:86)',
			],
		},
	}

	const create = () => {
		const events: ErrorEvent[] = []
		const handle = createHandler(
			async event => {
				events.push(event)
			},
			{
				async loadPrefix(functionName, version) {
					return functionName === 'test-app--function--bundle' && version === '42'
						? 'sourcemaps/test-app--function--bundle/abc123/'
						: undefined
				},
				async loadMap(key) {
					return key === 'sourcemaps/test-app--function--bundle/abc123/index.mjs.map' ? map : undefined
				},
			}
		)

		return { events, handle }
	}

	it('delivers a symbolicated stack & message to the consumer', async () => {
		const { events, handle } = create()

		await handle(logsEvent(runtimeError), context())

		expect(events).toHaveLength(1)
		expect(events[0]!.message).toBe('applyLimit is not a function')
		expect(events[0]!.stackTrace).toStrictEqual([
			'TypeError: applyLimit is not a function',
			'    at createTask (src/tasks/create.ts:12:9)',
			'    at n (entry.ts:3:22)',
		])
	})

	it('delivers the raw error when the stream names an unknown version', async () => {
		const { events, handle } = create()

		await handle(logsEvent(runtimeError, '2026/08/21/[7]abcdef1234567890'), context())

		expect(events).toHaveLength(1)
		expect(events[0]!.message).toBe('n is not a function')
		expect(events[0]!.stackTrace).toStrictEqual(runtimeError.message.stackTrace)
	})

	it('delivers the raw error when the stream carries no version', async () => {
		const { events, handle } = create()

		await handle(logsEvent(runtimeError, '2026/08/21/no-version-here'), context())

		expect(events).toHaveLength(1)
		expect(events[0]!.message).toBe('n is not a function')
	})
})
