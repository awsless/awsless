import { seconds } from '@awsless/duration'
import { mockSQS, sendMessage, sendMessageBatch, subscribe } from '../src'

describe('SQS', () => {
	const mock = mockSQS({
		test: () => {},
	})

	it('subscribe', async () => {
		const handleMessage = vi.fn()

		// Start subscribeing
		const unsub = subscribe({
			queue: 'test',
			maxMessages: 10,
			waitTime: seconds(20),
			visibilityTimeout: seconds(30),
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

		// Verify handler was called
		expect(handleMessage).toHaveBeenCalledTimes(2)
		expect(handleMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: { data: 'message' },
			})
		)

		// Stop subscribeing and wait for in-flight messages to complete
		unsub()
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
