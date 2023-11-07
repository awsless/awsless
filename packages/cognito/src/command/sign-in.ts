import { Device, getUserDevice, removeUserDevice, setUserDevice } from '../helper/device.js'
import { Session } from '../session.js'
import { generateDeviceSecret, generateVerifier, srp } from '../srp.js'
import { Token } from '../token.js'
import { Client } from '../client.js'
import { ResponseError } from '../error/response-error.js'
import { NewPasswordRequired } from '../error/new-password-required.js'
import { generateSecretHash } from '../helper/secret.js'
import { Unauthorized } from '../error/unauthorized.js'

export type SignInProps = {
	username: string
	password: string
	attributes?: Record<string, string>
}

export const signIn = async (client: Client, props: SignInProps) => {
	const device = getUserDevice(client, props.username)

	var result

	try {
		result = await userAuth(client, {
			...props,
			device,
		})
	} catch (error) {
		if (
			error instanceof ResponseError &&
			error.code === 'ResourceNotFoundException' &&
			error.message.toLowerCase().includes('device')
		) {
			removeUserDevice(client, props.username)

			result = await userAuth(client, props)
		} else {
			throw error
		}
	}

	if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
		const userAttributes = JSON.parse(result.ChallengeParameters.userAttributes)
		throw new NewPasswordRequired(props.username, result.Session, userAttributes)
	}

	const data = result.AuthenticationResult
	const idToken = Token.fromString(data.IdToken)
	const accessToken = Token.fromString(data.AccessToken)
	const refreshToken = data.RefreshToken
	const newDevice = data.NewDeviceMetadata
	const session = new Session({ idToken, accessToken })

	if (newDevice) {
		await confirmDevice(client, {
			accessToken,
			userId: result.userId,
			key: newDevice.DeviceKey,
			group: newDevice.DeviceGroupKey,
		})
	}

	client.store.set('token', {
		id: idToken.toString(),
		access: accessToken.toString(),
		refresh: refreshToken,
		drift: session.clockDrift,
	})

	return session
}

type UserAuthProps = SignInProps & {
	device?: Device
}

const userAuth = async (client: Client, props: UserAuthProps) => {
	const result = await userSrpAuth(client, props)

	if (result.ChallengeName === 'DEVICE_SRP_AUTH') {
		return {
			userId: result.userId,
			...(await deviceSrpAuth(client, {
				device: props.device!,
				userId: result.userId,
				session: result.Session,
			})),
		}
	}

	return result
}

const userSrpAuth = async (client: Client, props: UserAuthProps) => {
	const [A, next] = await srp(client.userPoolId)

	const params: {
		USERNAME: string
		SRP_A: string
		DEVICE_KEY?: string
		SECRET_HASH?: string
	} = {
		USERNAME: props.username,
		SRP_A: A,
	}

	if (client.secret) {
		params.SECRET_HASH = await generateSecretHash(client, props.username)
	}

	if (props.device) {
		params.DEVICE_KEY = props.device.key
	}

	const result = (await client.call('InitiateAuth', {
		ClientId: client.id,
		AuthFlow: 'USER_SRP_AUTH',
		ClientMetadata: props.attributes,
		AuthParameters: params,
	})) as {
		ChallengeName?: 'PASSWORD_VERIFIER'
		Session: string
		ChallengeParameters: {
			USER_ID_FOR_SRP: string
			SRP_B: string
			SALT: string
			SECRET_BLOCK: string
		}
	}

	const userId = result.ChallengeParameters.USER_ID_FOR_SRP

	if (result.ChallengeName === 'PASSWORD_VERIFIER') {
		const [signature, timestamp] = await next(
			userId,
			props.password,
			result.ChallengeParameters.SRP_B,
			result.ChallengeParameters.SALT,
			result.ChallengeParameters.SECRET_BLOCK
		)

		const responses: {
			USERNAME: string
			TIMESTAMP: string
			PASSWORD_CLAIM_SIGNATURE: string
			PASSWORD_CLAIM_SECRET_BLOCK: string
			DEVICE_KEY?: string
			SECRET_HASH?: string
		} = {
			USERNAME: userId,
			TIMESTAMP: timestamp,
			PASSWORD_CLAIM_SIGNATURE: signature,
			PASSWORD_CLAIM_SECRET_BLOCK: result.ChallengeParameters.SECRET_BLOCK,
		}

		if (client.secret) {
			responses.SECRET_HASH = await generateSecretHash(client, props.username)
		}

		if (props.device) {
			responses.DEVICE_KEY = props.device.key
		}

		try {
			const challengeResult = await client.call('RespondToAuthChallenge', {
				ChallengeName: 'PASSWORD_VERIFIER',
				ChallengeResponses: responses,
				ClientId: client.id,
				ClientMetadata: props.attributes,
				Session: result.Session,
			})

			return { ...challengeResult, userId }
		} catch (error) {
			if (error instanceof ResponseError && error.code === 'NotAuthorizedException') {
				throw new Unauthorized()
			}

			throw error
		}
	}

	return { ...result, userId }
}

type DeviceSrpProps = {
	userId: string
	device: Device
	session: Session
}

const deviceSrpAuth = async (client: Client, { device, userId, session }: DeviceSrpProps) => {
	const [A, next] = await srp(device.group)

	const result = await client.call('RespondToAuthChallenge', {
		Session: session,
		ClientId: client.id,
		ChallengeName: 'DEVICE_SRP_AUTH',
		ChallengeResponses: {
			SRP_A: A,
			USERNAME: userId,
			DEVICE_KEY: device.key,
		},
	})

	const [signature, timestamp] = await next(
		device.key,
		device.secret,
		result.ChallengeParameters.SRP_B,
		result.ChallengeParameters.SALT,
		result.ChallengeParameters.SECRET_BLOCK
	)

	return client.call('RespondToAuthChallenge', {
		Session: result.Session,
		ClientId: client.id,
		ChallengeName: 'DEVICE_PASSWORD_VERIFIER',
		ChallengeResponses: {
			USERNAME: userId,
			DEVICE_KEY: device.key,
			TIMESTAMP: timestamp,
			PASSWORD_CLAIM_SIGNATURE: signature,
			PASSWORD_CLAIM_SECRET_BLOCK: result.ChallengeParameters.SECRET_BLOCK,
		},
	})
}

type ConfirmDeviceProps = {
	userId: string
	accessToken: Token
	key: string
	group: string
}

const confirmDevice = async (client: Client, { userId, accessToken, key, group }: ConfirmDeviceProps) => {
	const secret = generateDeviceSecret()
	const name = typeof navigator !== 'undefined' ? navigator.userAgent : 'nodejs'

	const [verifier, salt] = await generateVerifier(group, key, secret)

	await client.call('ConfirmDevice', {
		DeviceKey: key,
		DeviceName: name,
		AccessToken: accessToken.toString(),
		DeviceSecretVerifierConfig: {
			Salt: salt,
			PasswordVerifier: verifier,
		},
	})

	const device = {
		key,
		group,
		secret,
	}

	setUserDevice(client, userId, device)
}
