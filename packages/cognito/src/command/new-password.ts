import { Client } from '../client.js'
import { generateSecretHash } from '../helper/secret.js'

export type NewPasswordProps = {
	password: string
}

export type NewPasswordSessionProps = {
	username: string
	session: string
	// userAttributes?: object
}

export const newPassword = async (client: Client, error: NewPasswordSessionProps, props: NewPasswordProps) => {
	const responses: {
		USERNAME: string
		NEW_PASSWORD: string
		SECRET_HASH?: string
	} = {
		USERNAME: error.username,
		NEW_PASSWORD: props.password,
	}

	if (client.secret) {
		responses.SECRET_HASH = await generateSecretHash(client, error.username)
	}

	await client.call('RespondToAuthChallenge', {
		Session: error.session,
		ClientId: client.id,
		ChallengeName: 'NEW_PASSWORD_REQUIRED',
		ChallengeResponses: responses,
	})
}
