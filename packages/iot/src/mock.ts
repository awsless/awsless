import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot'
import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { mockClient } from 'aws-sdk-client-mock'

export const mockIoT = () => {
	const fn = vi.fn()

	// @ts-ignore
	mockClient(IoTClient).on(DescribeEndpointCommand).resolves({
		// @ts-ignore
		endpointAddress: 'endpoint',
	})

	// @ts-ignore
	mockClient(IoTDataPlaneClient)
		// @ts-ignore
		.on(PublishCommand)
		.callsFake(() => {
			fn()
		})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
