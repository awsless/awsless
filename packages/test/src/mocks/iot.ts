
import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot'
import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { mockClient } from 'aws-sdk-client-mock'
import { mockFn, Func, asyncCall } from '../helpers/mock'

export const mockIoT = (fn: Func = () => {}) => {
	const mock = mockFn(fn)

	mockClient(IoTClient)
		.on(DescribeEndpointCommand)
		.resolves({
			endpointAddress: 'endpoint'
		})

	mockClient(IoTDataPlaneClient)
		.on(PublishCommand)
		.callsFake(() => {
			return asyncCall(mock)
		})

	beforeEach && beforeEach(() => {
		mock.mockClear()
	})

	return mock
}
