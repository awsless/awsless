import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot'
import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { mockClient } from 'aws-sdk-client-mock'
// @ts-ignore
import { Mock } from 'vitest'

export const mockIoT = () => {
	const fn = vi.fn()

	mockClient(IoTClient).on(DescribeEndpointCommand).resolves({
		endpointAddress: 'endpoint',
	})

	mockClient(IoTDataPlaneClient)
		.on(PublishCommand)
		.callsFake(() => {
			fn()
		})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
