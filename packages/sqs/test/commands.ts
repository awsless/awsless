import { listen, mockSQS, sendMessage, sendMessageBatch } from '../src'

describe('SQS', () => {
	const mock = mockSQS({
		test: () => {},
	})

	it('should listen for messages and delete them', async () => {
		const handleMessage = vi.fn()

		// Start listening
		const unsub = listen({
			queue: 'test',
			maxMessages: 10,
			waitTimeSeconds: 0,
			visibilityTimeout: 30,
			handleMessage,
		})

		// Send some messages
		await sendMessage({
			queue: 'test',
			payload: { data: 'message' },
		})

		await sendMessage({
			queue: 'test',
			payload: { data: 'message' },
		})

		// Wait for messages to be processed
		await new Promise(resolve => setTimeout(resolve, 100))

		// Stop listening (now async)
		await unsub()

		// Verify handler was called
		expect(handleMessage).toHaveBeenCalledTimes(2)
		expect(handleMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				Body: JSON.stringify({ data: 'message' }),
				MessageId: expect.any(String),
				ReceiptHandle: expect.any(String),
			}),
			expect.objectContaining({
				signal: expect.any(AbortSignal),
			})
		)
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
