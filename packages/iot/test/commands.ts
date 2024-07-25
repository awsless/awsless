import { mockIoT, publish, QoS } from '../src'

describe('IoT', () => {
	const mock = mockIoT()

	it('should publish IoT message', async () => {
		await publish({
			topic: 'test',
			payload: Buffer.from('test'),
			qos: QoS.AtLeastOnce,
		})

		expect(mock).toBeCalledTimes(1)
	})
})
