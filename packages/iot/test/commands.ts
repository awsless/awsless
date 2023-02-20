import { publish, mockIoT } from '../src'

describe('IoT', () => {
	const mock = mockIoT()

	it('should publish IoT message', async () => {
		await publish({
			topic: 'test',
			event: 'test',
			value: 'test',
		})

		expect(mock).toBeCalledTimes(1)
	})
})
