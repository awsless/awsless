
import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane'
import { globalClient } from '../helper.js'

export const iotClient = globalClient(() => {
	return new IoTDataPlaneClient({})
})
