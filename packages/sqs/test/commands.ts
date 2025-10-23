import { seconds } from '@awsless/duration'
import { listen, mockSQS, sendMessage, sendMessageBatch } from '../src'

describe('SQS', () => {
	const mock = mockSQS({
		test: () => {},
	})

	it('listen', async () => {
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

		// Wait a moment to ensure messages are picked up
		await new Promise(resolve => setTimeout(resolve, 100))

		// Stop listening and wait for in-flight messages to complete
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

	it('in-flight messages', async () => {
		let completed = 0
		const handleMessage = vi.fn(async () => {
			await new Promise(resolve => setTimeout(resolve, 1000))
			completed++
		})

		const unsub = listen({
			queue: 'test',
			maxMessages: 10,
			waitTimeSeconds: 0,
			visibilityTimeout: 30,
			handleMessage,
		})

		await sendMessage({
			queue: 'test',
			payload: { data: 'message' },
		})

		// Wait for message to be picked up
		await new Promise(resolve => setTimeout(resolve, 50))

		// Stop listening immediately without waiting
		await unsub(seconds(0))

		// Handler should have been called but not completed yet
		expect(handleMessage).toHaveBeenCalledTimes(1)
		expect(completed).toBe(0)

		// Wait for processing to actually finish
		await unsub(seconds(30))
		expect(completed).toBe(1)
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
