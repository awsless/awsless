import { Client } from '../client'

export type Device = {
	key: string
	secret: string
	group: string
}

export const getUserDevice = (client: Client, username: string) => {
	const deviceStore = client.deviceStore
	const store = client.store

	if (deviceStore) {
		const device = deviceStore.get<Device>(`device.${username}`)
		if (device) {
			store.set('device', device)
			return device
		}
	}

	return store.get<Device>('device')
}

export const setUserDevice = (client: Client, username: string, device: Device) => {
	const deviceStore = client.deviceStore

	if (deviceStore) {
		deviceStore.set(`device.${username}`, device)
	}

	client.store.set('device', device)
}

export const removeUserDevice = (client: Client, username: string) => {
	const deviceStore = client.deviceStore

	if (deviceStore) {
		deviceStore.remove(`device.${username}`)
	}

	return client.store.remove('device')
}
