import { publish, mockSNS } from '../src'

describe('SNS', () => {
	const mock = mockSNS({
		test: () => {},
	})

	it('should send a notification', async () => {
		await publish({
			topic: 'test',
		})

		expect(mock.test).toBeCalledTimes(1)
	})
})
