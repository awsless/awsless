
import { describe, it } from 'vitest'
import { addQueueBatch, addQueueMessage } from '../../src'
import { mockSQS } from '@heat/aws-test'

describe('SQS', () => {

	const mock = mockSQS({
		test: () => {}
	})

	it('should add a queue message', async () => {
		await addQueueMessage({
			queue: 'test',
			payload: 1
		})

		expect(mock.test).toBeCalledTimes(1)
	})

	it('should batch multiple queue messages', async () => {
		const items = Array(40)
			.fill(null)
			.map((_, i) => ({ payload: i + 1 }))

		await addQueueBatch({
			queue: 'test',
			items
		})

		expect(mock.test).toBeCalledTimes(4)
	})
})
