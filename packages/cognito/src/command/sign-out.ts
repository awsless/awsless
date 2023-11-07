import { Client } from '../client.js'
import { ResponseError } from '../error/response-error.js'
import { Unauthorized } from '../error/unauthorized.js'
import { getSession } from './get-session.js'

const removeLocalState = (client: Client) => {
	const store = client.store
	store.remove('token')
	store.remove('device')

	// if (client.getDeviceStore()) {
	// 	store.remove('device')
	// }
}

export const signOut = async (client: Client) => {
	let session
	try {
		session = await getSession(client)
	} catch (error) {
		if (error instanceof Unauthorized) {
			removeLocalState(client)
			return
		}

		throw error
	}

	try {
		await client.call('GlobalSignOut', {
			AccessToken: session.accessToken.toString(),
		})
	} catch (error) {
		if (error instanceof ResponseError && error.code === 'NotAuthorizedException') {
			removeLocalState(client)
			return
		}

		throw error
	}

	removeLocalState(client)
}
