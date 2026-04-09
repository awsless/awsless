import { seconds } from '@awsless/duration'
import { deleteMessageBatch, mockSQS, receiveMessages, sendMessage, sendMessageBatch, subscribe } from '../src'

describe('SQS', () => {
	const mock = mockSQS({
		test: () => {},
	})

	it('subscribe', async () => {
		const ac = new AbortController()
		const received: { payload: unknown; attributes: Record<string, string> }[] = []

		// Send some messages first
		await sendMessage({
			queue: 'test',
			payload: { data: 'message' },
		})

		await sendMessage({
			queue: 'test',
			payload: { data: 'message' },
		})

		// Consume messages
		for await (const batch of subscribe({
			queue: 'test',
			maxMessages: 10,
			waitTime: seconds(1),
			visibilityTimeout: seconds(30),
			signal: ac.signal,
		})) {
			received.push(...batch)

			if (received.length >= 2) {
				break
			}
		}

		// Verify messages were received
		expect(received.length).toBe(2)
		expect(received[0]).toEqual(
			expect.objectContaining({
				payload: { data: 'message' },
			})
		)
	})

	it('should batch delete messages', async () => {
		// Send messages
		await sendMessage({ queue: 'test', payload: { data: 1 } })
		await sendMessage({ queue: 'test', payload: { data: 2 } })
		await sendMessage({ queue: 'test', payload: { data: 3 } })

		// Receive them to get receipt handles
		const messages = await receiveMessages({
			queue: 'test',
			maxMessages: 10,
			visibilityTimeout: seconds(30),
			waitTime: seconds(1),
		})

		expect(messages.length).toBe(3)

		// Batch delete
		await deleteMessageBatch({
			queue: 'test',
			receiptHandles: messages.map(m => m.ReceiptHandle!),
		})

		// Verify queue is empty
		const remaining = await receiveMessages({
			queue: 'test',
			maxMessages: 10,
			visibilityTimeout: seconds(30),
			waitTime: seconds(1),
		})

		expect(remaining.length).toBe(0)
	})

	it('should add a queue message', async () => {
		await sendMessage({
			queue: 'test',
			payload: 1,
		})

		expect(mock.test).toBeCalledTimes(1)
	})

	it('should batch multiple queue messages', async () => {
		const items = Array(40)
			.fill(null)
			.map((_, i) => ({ payload: i + 1 }))

		await sendMessageBatch({
			queue: 'test',
			items,
		})

		expect(mock.test).toBeCalledTimes(4)
	})
})
