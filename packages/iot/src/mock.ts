import { DescribeEndpointCommand, IoTClient } from '@aws-sdk/client-iot'
import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { mockClient } from 'aws-sdk-vitest-mock'

export const mockIoT = (): ReturnType<typeof vi.fn> => {
	const fn = vi.fn()

	mockClient(IoTClient).on(DescribeEndpointCommand).resolves({
		endpointAddress: 'endpoint',
	})

	mockClient(IoTDataPlaneClient)
		.on(PublishCommand)
		.callsFake(async () => {
			fn()
			return {}
		})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
