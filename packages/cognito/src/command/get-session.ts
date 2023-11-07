import { Client } from '../client.js'
import { ResponseError } from '../error/response-error.js'
import { Unauthorized } from '../error/unauthorized.js'
import { Session } from '../session.js'
import { Token } from '../token.js'

export const getSession = async (client: Client) => {
	const token = client.store.get<{
		id: string
		access: string
		refresh: string
		drift: number
	}>('token')

	if (!token) {
		throw new Unauthorized('No user logged in')
	}

	const session = new Session({
		idToken: Token.fromString(token.id),
		accessToken: Token.fromString(token.access),
		clockDrift: token.drift,
	})

	if (session.isValid()) {
		return session
	}

	const device = client.store.get<{ key: string }>('device')

	if (!device) {
		throw new Unauthorized('No device')
	}

	let result

	try {
		result = await client.call('InitiateAuth', {
			ClientId: client.id,
			AuthFlow: 'REFRESH_TOKEN_AUTH',
			AuthParameters: {
				DEVICE_KEY: device.key,
				REFRESH_TOKEN: token.refresh,
			},
		})
	} catch (error) {
		if (error instanceof ResponseError && error.code === 'NotAuthorizedException') {
			client.store.remove('token')
			throw new Unauthorized('Invalid refresh token')
		}

		throw error
	}

	const data = result.AuthenticationResult
	const idToken = Token.fromString(data.IdToken)
	const accessToken = Token.fromString(data.AccessToken)
	const refreshToken = data.RefreshToken || token.refresh
	const newSession = new Session({ idToken, accessToken })

	client.store.set('token', {
		id: idToken.toString(),
		access: accessToken.toString(),
		refresh: refreshToken,
		drift: newSession.clockDrift,
	})

	return newSession
}
