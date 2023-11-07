import { getSession } from './get-session.js'
import { Client } from '../client.js'

export type ListDevicesProps = {
	limit?: number
	cursor?: string
}

export const listDevices = async (client: Client, props: ListDevicesProps) => {
	const session = await getSession(client)
	const result = (await client.call('ListDevices', {
		AccessToken: session.accessToken.toString(),
		Limit: props.limit ?? 10,
		PaginationToken: props.cursor,
	})) as {
		PaginationToken?: string
		Devices?: {
			DeviceKey: string
		}[]
	}

	return {
		cursor: result.PaginationToken,
		items: (result.Devices ?? []).map(item => ({
			key: item.DeviceKey,
		})),
	}
}
