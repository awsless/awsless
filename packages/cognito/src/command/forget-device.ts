import { getSession } from './get-session.js'
import { Client } from '../client.js'

export type ForgetDeviceProps = {
	deviceKey: string
}

export const forgetDevice = async (client: Client, props: ForgetDeviceProps) => {
	const session = await getSession(client)

	return client.call('ForgetDevice', {
		AccessToken: session.accessToken.toString(),
		DeviceKey: props.deviceKey,
	})
}
