import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSqsServer } from '../src/dev/servers/sqs'
import { DevFailureReport } from '../src/feature'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type Message = {
	MessageId: string
	ReceiptHandle: string
	Body: string
	Attributes: Record<string, string>
}

const createClient = (port: number) => {
	const call = async <T = Record<string, any>>(target: string, input: unknown): Promise<T> => {
		const res = await fetch(`http://127.0.0.1:${port}/`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-amz-json-1.0',
				'x-amz-target': `AmazonSQS.${target}`,
			},
			body: JSON.stringify(input),
		})

		const data = (await res.json()) as T & { message?: string }

		if (!res.ok) {
			throw new Error(data.message)
		}

		return data
	}

	const url = (queue: string) => `http://127.0.0.1:${port}/000000000000/${queue}`

	return {
		call,
		url,
		send: (queue: string, body: string, extra: Record<string, unknown> = {}) =>
			call('SendMessage', { QueueUrl: url(queue), MessageBody: body, ...extra }),
		receive: (queue: string, extra: Record<string, unknown> = {}) =>
			call<{ Messages?: Message[] }>('ReceiveMessage', { QueueUrl: url(queue), ...extra }).then(
				result => result.Messages ?? []
			),
		attributes: (queue: string) =>
			call<{ Attributes: Record<string, string> }>('GetQueueAttributes', { QueueUrl: url(queue) }).then(
				result => result.Attributes
			),
	}
}

describe('dev sqs emulator', () => {
	const servers: { stop: () => Promise<void> }[] = []

	const boot = async (visibilityTimeouts?: Map<string, number>) => {
		const server = createSqsServer({
			region: 'us-east-1',
			accountId: '000000000000',
			queues: new Map([
				['pull', undefined],
				['push', 'stack:consumer'],
			]),
			visibilityTimeouts,
		})

		const port = await server.listen()
		servers.push(server)

		return { server, client: createClient(port) }
	}

	afterEach(async () => {
		await Promise.all(servers.splice(0).map(server => server.stop()))
	})

	it('should hide a received message until its visibility timeout passes', async () => {
		const { client } = await boot()

		await client.send('pull', 'one')

		const [first] = await client.receive('pull', { VisibilityTimeout: 1 })

		expect(first).toMatchObject({ Body: 'one', Attributes: { ApproximateReceiveCount: '1' } })
		expect(first!.ReceiptHandle).toBeTruthy()

		// In flight: invisible to the next receive & counted as such.
		await expect(client.receive('pull')).resolves.toEqual([])
		await expect(client.attributes('pull')).resolves.toMatchObject({
			ApproximateNumberOfMessages: '0',
			ApproximateNumberOfMessagesNotVisible: '1',
		})

		await sleep(1100)

		const [second] = await client.receive('pull', { VisibilityTimeout: 1 })

		expect(second).toMatchObject({
			MessageId: first!.MessageId,
			Attributes: {
				ApproximateReceiveCount: '2',
				ApproximateFirstReceiveTimestamp: first!.Attributes.ApproximateFirstReceiveTimestamp,
			},
		})
		expect(second!.ReceiptHandle).not.toBe(first!.ReceiptHandle)

		// A stale receipt from the earlier receive deletes nothing.
		await client.call('DeleteMessage', { QueueUrl: client.url('pull'), ReceiptHandle: first!.ReceiptHandle })
		await expect(client.attributes('pull')).resolves.toMatchObject({ ApproximateNumberOfMessagesNotVisible: '1' })

		await client.call('DeleteMessage', { QueueUrl: client.url('pull'), ReceiptHandle: second!.ReceiptHandle })
		await expect(client.attributes('pull')).resolves.toMatchObject({
			ApproximateNumberOfMessages: '0',
			ApproximateNumberOfMessagesNotVisible: '0',
		})
	})

	it('should make a message visible again on a zero visibility change', async () => {
		const { client } = await boot()

		await client.send('pull', 'again')

		const [message] = await client.receive('pull', { VisibilityTimeout: 30 })

		await expect(client.receive('pull')).resolves.toEqual([])

		await client.call('ChangeMessageVisibility', {
			QueueUrl: client.url('pull'),
			ReceiptHandle: message!.ReceiptHandle,
			VisibilityTimeout: 0,
		})

		await expect(client.receive('pull')).resolves.toMatchObject([{ MessageId: message!.MessageId }])
	})

	it('should delay a pull queue message by DelaySeconds', async () => {
		const { client } = await boot()

		await client.send('pull', 'later', { DelaySeconds: 1 })

		// Never received yet, so it counts as delayed rather than in flight.
		await expect(client.receive('pull')).resolves.toEqual([])
		await expect(client.attributes('pull')).resolves.toMatchObject({
			ApproximateNumberOfMessagesNotVisible: '0',
			ApproximateNumberOfMessagesDelayed: '1',
		})

		await sleep(1100)

		await expect(client.receive('pull')).resolves.toMatchObject([{ Body: 'later' }])
	})

	it('should hide a received message for the configured visibility timeout by default', async () => {
		const { client } = await boot(new Map([['pull', 1]]))

		await client.send('pull', 'configured')

		await expect(client.receive('pull')).resolves.toMatchObject([{ Body: 'configured' }])
		await expect(client.receive('pull')).resolves.toEqual([])

		await sleep(1100)

		await expect(client.receive('pull')).resolves.toMatchObject([{ Body: 'configured' }])
	})

	it('should send, receive & delete in batches and purge the rest', async () => {
		const { client } = await boot()

		const sent = await client.call('SendMessageBatch', {
			QueueUrl: client.url('pull'),
			Entries: [
				{ Id: 'a', MessageBody: 'one' },
				{ Id: 'b', MessageBody: 'two', DelaySeconds: 60 },
				{ Id: 'c', MessageBody: 'three' },
			],
		})

		expect(sent.Successful.map((entry: { Id: string }) => entry.Id)).toEqual(['a', 'b', 'c'])
		expect(sent.Failed).toEqual([])

		const received = await client.receive('pull', { MaxNumberOfMessages: 10 })

		expect(received.map(message => message.Body)).toEqual(['one', 'three'])

		const deleted = await client.call('DeleteMessageBatch', {
			QueueUrl: client.url('pull'),
			Entries: received.map((message, index) => ({ Id: String(index), ReceiptHandle: message.ReceiptHandle })),
		})

		expect(deleted.Successful).toEqual([{ Id: '0' }, { Id: '1' }])
		await expect(client.attributes('pull')).resolves.toMatchObject({
			ApproximateNumberOfMessages: '0',
			ApproximateNumberOfMessagesDelayed: '1',
		})

		await client.call('PurgeQueue', { QueueUrl: client.url('pull') })

		await expect(client.attributes('pull')).resolves.toMatchObject({
			ApproximateNumberOfMessages: '0',
			ApproximateNumberOfMessagesNotVisible: '0',
			ApproximateNumberOfMessagesDelayed: '0',
		})
	})

	it('should resolve a long poll as soon as a message arrives', async () => {
		const { client } = await boot()
		const started = Date.now()
		const waiting = client.receive('pull', { WaitTimeSeconds: 5 })

		await sleep(200)
		await client.send('pull', 'polled')

		await expect(waiting).resolves.toMatchObject([{ Body: 'polled' }])
		expect(Date.now() - started).toBeLessThan(2000)
	})

	it('should dispatch push queue messages as sqs events & report failures', async () => {
		const { server, client } = await boot()
		const dispatch = vi.fn(async (event: any) => {
			if (JSON.parse(event.Records[0].body).fail) {
				throw new Error('consumer failed')
			}
		})
		const reports: DevFailureReport[] = []

		server.connect(dispatch, report => reports.push(report))

		const sent = await client.send('push', JSON.stringify({ fail: false }), {
			MessageAttributes: { kind: { DataType: 'String', StringValue: 'test' } },
		})

		expect(sent.MD5OfMessageAttributes).toMatch(/^[0-9a-f]{32}$/)

		await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))

		expect(dispatch.mock.calls[0]![0]).toMatchObject({
			Records: [
				{
					messageId: sent.MessageId,
					body: JSON.stringify({ fail: false }),
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:push',
					messageAttributes: { kind: { dataType: 'String', stringValue: 'test' } },
				},
			],
		})

		await client.send('push', JSON.stringify({ fail: true }))

		await vi.waitFor(() => expect(reports).toHaveLength(1))

		expect(reports[0]).toMatchObject({
			kind: 'queue',
			routeKey: 'stack:consumer',
			event: { fail: true },
			queue: { name: 'push' },
		})
		expect((reports[0]!.error as Error).message).toBe('consumer failed')
	})

	it('should drop delayed push messages when the server stops', async () => {
		const { server, client } = await boot()
		const dispatch = vi.fn(async () => {})

		server.connect(dispatch)

		await client.send('push', '{}', { DelaySeconds: 1 })

		expect(dispatch).not.toHaveBeenCalled()

		await server.stop()
		await sleep(1100)

		expect(dispatch).not.toHaveBeenCalled()
	})

	it('should reject unknown queues', async () => {
		const { client } = await boot()

		await expect(client.send('missing', 'x')).rejects.toThrow('Unknown local queue')
		await expect(client.call('GetQueueUrl', { QueueName: 'missing' })).rejects.toThrow('Unknown local queue')
		await expect(client.call('GetQueueUrl', { QueueName: 'pull' })).resolves.toEqual({
			QueueUrl: client.url('pull'),
		})
	})
})
