
import { describe, it } from 'vitest'
import { sendNotification } from '../../src'
import { mockSNS } from '@heat/aws-test'

describe('SNS', () => {

	const mock = mockSNS({
		test: () => {}
	})

	it('should send a notification', async () => {
		await sendNotification({
			topic: 'test'
		})

		expect(mock.test).toBeCalledTimes(1)
	})
})
