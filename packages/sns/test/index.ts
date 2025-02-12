import { publish, mockSNS } from '../src'

describe('SNS', () => {
	const mock = mockSNS({
		test: () => {},
	})

	const mock2 = mockSNS({
		extend: () => {},
	})

	it('should send a notification', async () => {
		await publish({
			topic: 'test',
			payload: 'Hello World',
		})

		expect(mock.test).toBeCalledTimes(1)
	})

	it('should allow the extension', async () => {
		await publish({
			topic: 'extend',
			payload: 'Hello World',
		})

		expect(mock2.extend).toBeCalledTimes(1)
	})
})
