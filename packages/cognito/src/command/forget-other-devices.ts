import { forgetDevice } from './forget-device.js'
import { listDevices } from './list-devices.js'
import { Client } from '../client.js'

export type ForgetOtherDevicesProps = {
	deviceKey: string
}

export const forgetOtherDevices = async (client: Client, props: ForgetOtherDevicesProps) => {
	const devices: string[] = []
	let cursor: string | undefined

	while (true) {
		const result = await listDevices(client, {
			limit: 60,
			cursor,
		})

		cursor = result.cursor

		result.items.forEach(item => {
			if (props.deviceKey !== item.key) {
				devices.push(item.key)
			}
		})

		if (!cursor) {
			break
		}
	}

	return Promise.all(
		devices.map(deviceKey => {
			return forgetDevice(client, {
				deviceKey,
			})
		})
	)
}
