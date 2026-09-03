import { stringify } from '@awsless/json'
import { object, string } from '@awsless/validate'
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
		await expect(handle({ bucket: 'bucket', key: 'a.txt' })).resolves.toStrictEqual([{ bucket: 'bucket', key: 'a.txt' }])
		await expect(handle([{ bucket: 'bucket', key: 'a.txt' }])).resolves.toStrictEqual([{ bucket: 'bucket', key: 'a.txt' }])
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

		await expect(handle({ event: 'unsubscribed', ...base, topics: [], context: { userId: 'u1' } })).resolves.toBe('u1')
		await expect(handle({ event: 'unsubscribed', ...base, topics: [], context: {} } as any)).rejects.toThrow()
	})
})
