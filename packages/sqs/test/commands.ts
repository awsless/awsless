import { mockSQS, sendMessage, sendMessageBatch } from '../src'

describe('SQS', () => {
	const mock = mockSQS({
		test: () => {},
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
