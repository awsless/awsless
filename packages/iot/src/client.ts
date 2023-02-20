import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane'
import { globalClient } from '@awsless/utils'

export const iotClient = globalClient(() => {
	return new IoTDataPlaneClient({})
})
