
import { describe, it, expect } from 'vitest'
import { mockIoT } from '../../src'
import { PublishCommand, IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane'

describe('IoT Mock', () => {

	const iot = mockIoT()

	it('should publish iot message', async () => {
		const client = new IoTDataPlaneClient({})
		await client.send(new PublishCommand({
			qos: 1,
			topic: '',
			payload: Buffer.from(JSON.stringify({}))
		}))

		expect(iot).toBeCalledTimes(1)
	})
})
