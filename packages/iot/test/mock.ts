import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { mockIoT } from '../src'

describe('IoT Mock', () => {
	const iot = mockIoT()

	it('should publish iot message', async () => {
		const client = new IoTDataPlaneClient({})
		await client.send(
			new PublishCommand({
				qos: 1,
				topic: 'test',
				payload: Buffer.from(JSON.stringify({})),
			})
		)

		expect(iot).toBeCalledTimes(1)
	})
})
