import { stringify } from '@awsless/json'
import { ExpectedError } from '@awsless/lambda'
import { object, string } from '@awsless/validate'
import { error as onError, failure as onFailure } from '../src/lib/handle/failure'
import * as pubsub from '../src/lib/handle/pubsub'
import { event as storeEvent } from '../src/lib/handle/store'

describe('store handler', () => {
	const handle = storeEvent(async objects => objects)

	it('decodes s3 notification keys', async () => {
		await expect(
			handle({
				Records: [{ s3: { bucket: { name: 'bucket' }, object: { key: 'store/x/y/a+b%2Fc%20d.txt' } } }],
			})
		).resolves.toStrictEqual([{ bucket: 'bucket', key: 'store/x/y/a b/c d.txt' }])
	})

	it('accepts plain objects', async () => {
		await expect(handle({ bucket: 'bucket', key: 'a.txt' })).resolves.toStrictEqual([
			{ bucket: 'bucket', key: 'a.txt' },
		])
		await expect(handle([{ bucket: 'bucket', key: 'a.txt' }])).resolves.toStrictEqual([
			{ bucket: 'bucket', key: 'a.txt' },
		])
	})

	it('rejects other payloads', async () => {
		await expect(handle({ nope: true } as any)).rejects.toThrow('Invalid store notification input')
	})
})

describe('pubsub lifecycle handlers', () => {
	const base = { socketId: 'socket-1', ip: '1.1.1.1', date: new Date('2026-01-01T00:00:00.000Z') }

	it('parses lifecycle events', async () => {
		const handle = pubsub.connected(async event => event)

		await expect(handle({ event: 'connected', ...base })).resolves.toStrictEqual({ event: 'connected', ...base })
	})

	it('unwraps sns delivered events', async () => {
		const handle = pubsub.disconnected(async event => event)
		const message = { event: 'disconnected', ...base, context: { userId: 'u1' } }

		await expect(handle({ Records: [{ Sns: { Message: stringify(message) } }] })).resolves.toStrictEqual(message)
	})

	it('rejects the wrong lifecycle event', async () => {
		const handle = pubsub.connected(async event => event)

		await expect(handle({ event: 'disconnected', ...base } as any)).rejects.toThrow()
	})

	it('requires the topics on subscription events', async () => {
		const handle = pubsub.subscribed(async event => event.topics)

		await expect(handle({ event: 'subscribed', ...base } as any)).rejects.toThrow()
		await expect(handle({ event: 'subscribed', ...base, topics: ['chat.1'] })).resolves.toStrictEqual(['chat.1'])
	})

	it('validates the authorizer context', async () => {
		const handle = pubsub.unsubscribed(object({ userId: string() }), async event => event.context?.userId)

		await expect(handle({ event: 'unsubscribed', ...base, topics: [], context: { userId: 'u1' } })).resolves.toBe(
			'u1'
		)
		await expect(handle({ event: 'unsubscribed', ...base, topics: [], context: {} } as any)).rejects.toThrow()
	})
})

// Both consumers run as stand-alone lambdas outside the bundle, so the
// production paths are what matter.
describe('failure consumer', () => {
	beforeEach(() => {
		vi.stubEnv('LAMBDA_ENV', 'production')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('throws expected errors so the record retries & dead-letters', async () => {
		const handle = onFailure(() => {
			throw new ExpectedError('nope', 'Cannot handle this')
		})

		await expect(handle({ id: '1' })).rejects.toThrow('Cannot handle this')
	})

	it('throws unexpected errors', async () => {
		const handle = onFailure(() => {
			throw new Error('boom')
		})

		await expect(handle({ id: '1' })).rejects.toThrow('boom')
	})
})

describe('error log consumer', () => {
	const record = {
		hash: 'h',
		requestId: 'r',
		origin: 'stack:function:echo',
		level: 'error' as const,
		type: 'Error',
		message: 'boom',
		date: '2026-01-01T00:00:00.000Z',
	}

	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it('handles a valid record', async () => {
		const handle = onError(async event => event.date.toISOString())

		await expect(handle(record)).resolves.toBe(record.date)
		expect(console.warn).not.toHaveBeenCalled()
	})

	it.each(['test', 'production'])('never throws for a record it cannot process (%s)', async env => {
		vi.stubEnv('LAMBDA_ENV', env)

		const seen = vi.fn()
		const handle = onError(seen)

		await expect(handle({ ...record, level: 'info' } as any)).resolves.toBeUndefined()
		expect(seen).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalledTimes(1)
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('(validation)'))
	})

	it.each(['test', 'production'])('never throws an expected error (%s)', async env => {
		vi.stubEnv('LAMBDA_ENV', env)

		const handle = onError(() => {
			throw new ExpectedError('nope', 'Cannot handle this')
		})

		await expect(handle(record)).resolves.toBeUndefined()
		expect(console.warn).toHaveBeenCalledTimes(1)
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Cannot handle this'))
	})

	it('still propagates unexpected crashes', async () => {
		vi.stubEnv('LAMBDA_ENV', 'production')

		const handle = onError(() => {
			throw new Error('boom')
		})

		await expect(handle(record)).rejects.toThrow('boom')
		expect(console.warn).not.toHaveBeenCalled()
	})
})
